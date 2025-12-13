import { spawn } from "node:child_process";
import * as fs from "node:fs/promises";
import { createWriteStream } from "node:fs";
import * as readline from "node:readline/promises";
import { stdin as input, stdout as output } from "node:process";
import * as path from "node:path";
import * as net from "node:net";

// 默认端口
const DEFAULT_PORT = 8000;

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

// 查看日志（复用 view-logs.ts 的逻辑）
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

// 主函数
async function main() {
	const isCI =
		process.env.CI === "true" || process.env.PLAYWRIGHT === "True";

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
	let targetPort = DEFAULT_PORT;
	const cliPort = process.argv[2] ? Number.parseInt(process.argv[2], 10) : null;
	if (cliPort && !Number.isNaN(cliPort)) {
		targetPort = cliPort;
	}

	// 4. 检查目标端口的锁
	const existingPid = await readLock(targetPort);

	if (existingPid && isProcessAlive(existingPid)) {
		// 端口被占用
		if (isCI) {
			console.error(`错误: 端口 ${targetPort} 已在运行 (CI 环境)`);
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
					process.kill(existingPid, "SIGTERM");
					await new Promise((resolve) => setTimeout(resolve, 2000));
				} catch {
					console.log("进程已不存在");
				}
				await removeLock(targetPort);
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
		console.error(`端口 ${targetPort} 被其他程序占用`);
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

main().catch((err) => {
	console.error("启动失败:", err);
	process.exit(1);
});
