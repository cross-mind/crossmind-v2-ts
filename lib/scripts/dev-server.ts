import { spawn, execSync } from "node:child_process";
import * as fs from "node:fs/promises";
import * as readline from "node:readline/promises";
import { stdin as input, stdout as output } from "node:process";
import * as path from "node:path";
import * as net from "node:net";

// 默认端口
const DEFAULT_PORT = 8000;

// ============================================================================
// 工具函数
// ============================================================================

// 生成端口相关的文件路径
function getLockFile(port: number): string {
	return path.join(process.cwd(), `.logs/.lock-${port}`);
}

function getLogFile(port: number): string {
	return path.join(process.cwd(), `.logs/dev-server-${port}.log`);
}

// 检查进程是否存在
function isProcessAlive(pid: number): boolean {
	try {
		process.kill(pid, 0);
		return true;
	} catch {
		return false;
	}
}

// 检查端口是否可用
async function isPortAvailable(port: number): Promise<boolean> {
	return new Promise((resolve) => {
		const server = net.createServer();
		server.once("error", () => resolve(false));
		server.once("listening", () => {
			server.close();
			resolve(true);
		});
		server.listen(port);
	});
}

// 查找下一个可用端口
async function findNextAvailablePort(startPort: number): Promise<number> {
	let port = startPort;
	while (port < startPort + 10) {
		if (await isPortAvailable(port)) {
			return port;
		}
		port++;
	}
	throw new Error(`无法找到可用端口（尝试了 ${startPort} 到 ${port - 1}）`);
}

// 读取锁文件中的 PID
async function readLock(port: number): Promise<number | null> {
	try {
		const content = await fs.readFile(getLockFile(port), "utf-8");
		const pid = Number.parseInt(content.trim(), 10);
		return Number.isNaN(pid) ? null : pid;
	} catch {
		return null;
	}
}

// 写入锁文件
async function writeLock(port: number, pid: number): Promise<void> {
	await fs.writeFile(getLockFile(port), pid.toString(), "utf-8");
}

// 删除锁文件
async function removeLock(port: number): Promise<void> {
	try {
		await fs.unlink(getLockFile(port));
	} catch {}
}

// 检查占用端口的进程是否是本项目的
function checkPortProcess(port: number): {
	isOurs: boolean;
	pid: number | null;
} {
	try {
		// 查找占用端口的所有进程 PID
		const pidOutput = execSync(`lsof -ti:${port}`, {
			encoding: "utf-8",
			stdio: ["pipe", "pipe", "ignore"],
		}).trim();

		if (!pidOutput) {
			return { isOurs: false, pid: null };
		}

		const pids = pidOutput.split("\n").map((p) => Number.parseInt(p, 10)).filter((p) => !Number.isNaN(p));

		// 检查所有占用端口的进程
		for (const pid of pids) {
			try {
				// 获取进程的完整命令行
				const cmdOutput = execSync(`ps -p ${pid} -o command=`, {
					encoding: "utf-8",
					stdio: ["pipe", "pipe", "ignore"],
				}).trim();

				// 检查当前进程是否是 next-server
				const isNextServer = cmdOutput.includes("next-server");

				// 如果是 next-server 子进程，检查父进程
				if (isNextServer) {
					try {
						const ppidOutput = execSync(`ps -p ${pid} -o ppid=`, {
							encoding: "utf-8",
							stdio: ["pipe", "pipe", "ignore"],
						}).trim();

						const ppid = Number.parseInt(ppidOutput, 10);
						if (!Number.isNaN(ppid)) {
							const parentCmd = execSync(`ps -p ${ppid} -o command=`, {
								encoding: "utf-8",
								stdio: ["pipe", "pipe", "ignore"],
							}).trim();

							// 检查父进程是否包含 next dev 和当前项目路径
							const isNextDev = parentCmd.includes("next") && parentCmd.includes("dev");
							const isCurrentProject = parentCmd.includes(process.cwd());

							if (isNextDev && isCurrentProject) {
								return { isOurs: true, pid };
							}
						}
					} catch {
						// 如果获取父进程失败，继续检查下一个
					}
				}

				// 检查当前进程是否包含 next dev 和当前项目路径
				const isNextDev = cmdOutput.includes("next") && cmdOutput.includes("dev");
				const isCurrentProject = cmdOutput.includes(process.cwd());

				if (isNextDev && isCurrentProject) {
					return { isOurs: true, pid };
				}
			} catch {
				// 进程可能已经退出，继续检查下一个
			}
		}

		return { isOurs: false, pid: null };
	} catch {
		return { isOurs: false, pid: null };
	}
}

// 查找并停止占用指定端口的所有进程
function killProcessesOnPort(port: number): void {
	try {
		// 使用 lsof 查找占用端口的进程
		const output = execSync(`lsof -ti:${port}`, {
			encoding: "utf-8",
			stdio: ["pipe", "pipe", "ignore"],
		}).trim();

		if (output) {
			const pids = output.split("\n").map((pid) => Number.parseInt(pid, 10));
			for (const pid of pids) {
				if (!Number.isNaN(pid)) {
					try {
						process.kill(pid, "SIGTERM");
					} catch {
						// 进程可能已经不存在
					}
				}
			}
		}
	} catch {
		// lsof 可能找不到进程，这是正常的
	}
}

// 列出所有运行中的实例
async function listRunningInstances(): Promise<
	Array<{ port: number; pid: number }>
> {
	const instances: Array<{ port: number; pid: number }> = [];

	try {
		const files = await fs.readdir(".logs");
		for (const file of files) {
			if (file.startsWith(".lock-")) {
				const port = Number.parseInt(file.replace(".lock-", ""), 10);
				if (!Number.isNaN(port)) {
					const pid = await readLock(port);
					if (pid && isProcessAlive(pid)) {
						instances.push({ port, pid });
					}
				}
			}
		}
	} catch {}

	return instances;
}

// 询问用户如何处理端口冲突
async function askUserAction(
	port: number,
	existingPid: number,
): Promise<"restart" | "new-port" | "custom-port" | "view-logs" | "cancel"> {
	const rl = readline.createInterface({ input, output });

	console.log(`\n⚠️  端口 ${port} 已被占用 (PID: ${existingPid})`);
	console.log(`   日志位置: ${getLogFile(port)}\n`);
	console.log("请选择操作:");
	console.log("  1) 强制重启当前端口的服务器");
	console.log("  2) 使用下一个可用端口启动新实例");
	console.log("  3) 指定端口启动新实例");
	console.log("  4) 查看当前实例的日志");
	console.log("  5) 取消\n");

	const answer = await rl.question("请输入选项 (1-5): ");
	rl.close();

	switch (answer.trim()) {
		case "1":
			return "restart";
		case "2":
			return "new-port";
		case "3":
			return "custom-port";
		case "4":
			return "view-logs";
		default:
			return "cancel";
	}
}

// 询问用户指定端口
async function askCustomPort(): Promise<number | null> {
	const rl = readline.createInterface({ input, output });

	const answer = await rl.question("请输入端口号 (8000-9000): ");
	rl.close();

	const port = Number.parseInt(answer.trim(), 10);
	if (Number.isNaN(port) || port < 8000 || port > 9000) {
		console.log("无效的端口号");
		return null;
	}

	return port;
}

// ============================================================================
// 命令实现
// ============================================================================

// 查看日志
async function viewLogs(port: number): Promise<void> {
	const logFile = getLogFile(port);

	console.log(`\n监控日志: ${logFile} (端口 ${port})`);
	console.log("按 Ctrl+C 退出\n");

	// 读取现有内容
	try {
		const content = await fs.readFile(logFile, "utf-8");
		if (content) {
			process.stdout.write(content);
		}
	} catch (err: any) {
		if (err.code === "ENOENT") {
			console.log("日志文件不存在，等待服务器启动...\n");
		} else {
			console.error("无法读取日志文件:", err.message);
		}
	}

	// 监听文件变化
	let lastSize = 0;
	try {
		const stats = await fs.stat(logFile);
		lastSize = stats.size;
	} catch {}

	const { watchFile } = await import("node:fs");
	watchFile(logFile, { interval: 500 }, async (curr) => {
		if (curr.size > lastSize) {
			const { createReadStream } = await import("node:fs");
			const stream = createReadStream(logFile, {
				start: lastSize,
				end: curr.size,
			});
			stream.pipe(process.stdout);
			lastSize = curr.size;
		}
	});

	// Ctrl+C 处理
	process.on("SIGINT", () => {
		console.log("\n已停止监控");
		process.exit(0);
	});

	// 保持进程运行
	await new Promise(() => {});
}

// 停止服务器
async function stopServer(port: number): Promise<void> {
	console.log(`正在停止端口 ${port} 的服务器...`);

	const pid = await readLock(port);

	if (!pid) {
		// 没有锁文件，但可能有孤儿进程占用端口
		console.log(`未找到锁文件，检查端口 ${port} 是否被孤儿进程占用...`);
		killProcessesOnPort(port);
		await new Promise((resolve) => setTimeout(resolve, 500));
		console.log(`✓ 已尝试清理端口 ${port} 上的所有进程`);
		process.exit(0);
	}

	if (!isProcessAlive(pid)) {
		console.log(`进程 ${pid} 已不存在，清理锁文件...`);
		await removeLock(port);
		console.log("✓ 锁文件已清理");
		process.exit(0);
	}

	try {
		// 1. 首先停止主进程
		process.kill(pid, "SIGTERM");
		console.log(`✓ 已发送停止信号到进程 ${pid}`);

		// 2. 等待 2 秒让进程优雅退出
		await new Promise((resolve) => setTimeout(resolve, 2000));

		// 3. 如果主进程还活着，强制停止
		if (isProcessAlive(pid)) {
			console.log("进程未响应，尝试强制停止...");
			process.kill(pid, "SIGKILL");
			await new Promise((resolve) => setTimeout(resolve, 500));
		}

		// 4. 停止所有占用该端口的进程（包括子进程）
		killProcessesOnPort(port);
		await new Promise((resolve) => setTimeout(resolve, 500));

		// 5. 清理锁文件
		await removeLock(port);
		console.log(`✓ 已停止端口 ${port} 的服务器`);
	} catch (err: any) {
		console.error(`停止服务器失败: ${err.message}`);
		process.exit(1);
	}
}

// 启动开发服务器
async function startDevServer(port: number): Promise<void> {
	// 检测非交互环境：CI 环境或没有 TTY
	const isNonInteractive =
		process.env.CI === "true" ||
		process.env.PLAYWRIGHT === "True" ||
		!process.stdin.isTTY ||
		!process.stdout.isTTY;

	// 1. 创建 .logs 目录
	await fs.mkdir(".logs", { recursive: true });

	// 2. 显示当前运行的实例
	const runningInstances = await listRunningInstances();
	if (runningInstances.length > 0) {
		console.log("\n当前运行中的实例:");
		for (const instance of runningInstances) {
			console.log(`  - 端口 ${instance.port} (PID: ${instance.pid})`);
		}
		console.log("");
	}

	// 3. 确定要使用的端口
	let targetPort = port;

	// 4. 检查目标端口的锁
	const existingPid = await readLock(targetPort);

	if (existingPid && isProcessAlive(existingPid)) {
		// 端口被占用
		if (isNonInteractive) {
			console.error(`\n错误: 端口 ${targetPort} 已在运行 (PID: ${existingPid})`);
			console.error("由于检测到非交互环境（管道/重定向/CI），无法显示交互菜单\n");
			console.error("可用操作：");
			console.error(`  • 查看日志:       pnpm logs ${targetPort}`);
			console.error(`  • 使用其他端口:   pnpm dev ${targetPort + 1}`);
			console.error(`  • 停止并重启:     pnpm stop ${targetPort} && pnpm dev`);
			console.error(`  • 强制重启:       pnpm stop ${targetPort}; pnpm dev\n`);
			console.error("或者在交互式终端中运行 'pnpm dev' 以使用交互菜单");
			process.exit(1);
		}

		const action = await askUserAction(targetPort, existingPid);

		switch (action) {
			case "restart": {
				// 强制重启
				console.log(
					`正在停止端口 ${targetPort} 的服务器 (PID: ${existingPid})...`,
				);
				try {
					// 1. 停止主进程
					process.kill(existingPid, "SIGTERM");
					await new Promise((resolve) => setTimeout(resolve, 2000));

					// 2. 如果主进程还在，强制杀死
					if (isProcessAlive(existingPid)) {
						process.kill(existingPid, "SIGKILL");
						await new Promise((resolve) => setTimeout(resolve, 500));
					}
				} catch {
					console.log("进程已不存在");
				}

				// 3. 清理所有占用该端口的进程（包括子进程）
				killProcessesOnPort(targetPort);
				await new Promise((resolve) => setTimeout(resolve, 500));

				// 4. 清理锁文件
				await removeLock(targetPort);
				console.log("✓ 已停止旧服务器");
				break;
			}

			case "new-port": {
				// 查找下一个可用端口
				targetPort = await findNextAvailablePort(DEFAULT_PORT + 1);
				console.log(`使用端口 ${targetPort}`);
				break;
			}

			case "custom-port": {
				// 用户指定端口
				const customPort = await askCustomPort();
				if (!customPort) {
					console.log("已取消");
					process.exit(0);
				}

				// 检查自定义端口是否可用
				const customPid = await readLock(customPort);
				if (customPid && isProcessAlive(customPid)) {
					console.log(`端口 ${customPort} 也被占用，请重试`);
					process.exit(1);
				}

				if (!(await isPortAvailable(customPort))) {
					console.log(`端口 ${customPort} 不可用（可能被其他程序占用）`);
					process.exit(1);
				}

				targetPort = customPort;
				break;
			}

			case "view-logs": {
				// 直接查看当前实例日志
				await viewLogs(targetPort);
				process.exit(0);
			}

			case "cancel":
			default: {
				console.log("已取消");
				process.exit(0);
			}
		}
	}

	// 5. 检查端口是否真的可用
	if (!(await isPortAvailable(targetPort))) {
		// 检查是否是本项目的孤儿进程
		const portInfo = checkPortProcess(targetPort);

		if (portInfo.isOurs && portInfo.pid) {
			// 本项目的孤儿进程（锁文件丢失）
			console.error(`\n错误: 端口 ${targetPort} 被本项目的孤儿进程占用 (PID: ${portInfo.pid})`);
			console.error("锁文件可能已丢失，但进程仍在运行\n");
			console.error("可用操作：");
			console.error(`  • 查看日志:       pnpm logs ${targetPort}`);
			console.error(`  • 停止并重启:     pnpm stop ${targetPort} && pnpm dev`);
			console.error(`  • 使用其他端口:   pnpm dev ${targetPort + 1}\n`);
		} else {
			// 外部程序占用
			console.error(`\n错误: 端口 ${targetPort} 被其他程序占用，无法启动开发服务器\n`);
			console.error("可用操作：");
			console.error(`  • 查看占用进程:   lsof -i:${targetPort}`);
			console.error(`  • 停止占用进程:   kill -9 $(lsof -ti:${targetPort})`);
			console.error(`  • 使用其他端口:   pnpm dev ${targetPort + 1}`);
			console.error(`  • 使用自定义端口: pnpm dev <端口号>\n`);
		}
		process.exit(1);
	}

	// 6. 清空日志文件
	const logFile = getLogFile(targetPort);
	await fs.writeFile(logFile, "", "utf-8");

	// 7. 启动 Next.js（后台运行）
	console.log(`启动 Next.js 开发服务器 (http://localhost:${targetPort})`);
	console.log(`日志文件: ${logFile}`);
	console.log("\n📋 查看实时日志:");
	console.log(`   pnpm logs ${targetPort}`);
	if (targetPort !== DEFAULT_PORT) {
		console.log(`   或: pnpm logs:${targetPort}`);
	}
	console.log(`   或: tail -f ${logFile}\n`);

	// 使用 shell 重定向来确保日志持久化
	// 使用 sh -c 来执行命令，这样即使父进程退出，日志重定向也会继续
	const nextBin = path.join(process.cwd(), "node_modules", ".bin", "next");
	const command = `"${nextBin}" dev --turbo -p ${targetPort} >> "${logFile}" 2>&1`;

	const child = spawn("sh", ["-c", command], {
		stdio: "ignore",
		detached: true, // 后台运行
		env: { ...process.env, FORCE_COLOR: "0" }, // 禁用颜色代码以便日志可读
	});

	// 8. 写入锁文件（使用子进程 PID）
	if (!child.pid) {
		console.error("无法获取子进程 PID");
		process.exit(1);
	}
	await writeLock(targetPort, child.pid);
	console.log(`✓ 进程锁已获取 (端口 ${targetPort})`);

	// 9. 分离子进程，让它在后台继续运行
	child.unref();

	console.log(`✓ 服务器已在后台启动 (PID: ${child.pid})`);
	console.log(`✓ 使用 'pnpm logs ${targetPort}' 查看日志\n`);

	// 12. 主进程退出
	process.exit(0);
}

// ============================================================================
// 命令路由
// ============================================================================

async function main() {
	const command = process.argv[2];

	// 判断第一个参数是命令还是端口号
	const isCommand = command === "stop" || command === "logs";

	// 解析端口参数
	let port = DEFAULT_PORT;
	if (isCommand) {
		// 命令模式：pnpm stop 8000 或 pnpm logs 8000
		const portArg = process.argv[3];
		if (portArg) {
			const parsed = Number.parseInt(portArg, 10);
			port = Number.isNaN(parsed) ? DEFAULT_PORT : parsed;
		}
	} else {
		// 启动模式：pnpm dev 8001
		if (command) {
			const parsed = Number.parseInt(command, 10);
			port = Number.isNaN(parsed) ? DEFAULT_PORT : parsed;
		}
	}

	if (command === "stop") {
		await stopServer(port);
		return;
	}

	if (command === "logs") {
		await viewLogs(port);
		return;
	}

	// 默认命令：启动开发服务器
	await startDevServer(port);
}

main().catch((err) => {
	console.error("执行失败:", err);
	process.exit(1);
});
