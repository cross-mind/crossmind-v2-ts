import * as fs from "node:fs/promises";
import * as path from "node:path";
import { execSync } from "node:child_process";

const DEFAULT_PORT = 8000;

function getLockFile(port: number): string {
	return path.join(process.cwd(), `.logs/.lock-${port}`);
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

// 删除锁文件
async function removeLock(port: number): Promise<void> {
	try {
		await fs.unlink(getLockFile(port));
	} catch {}
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

async function main() {
	// 从命令行参数获取端口（可选）
	const port = process.argv[2] ? Number.parseInt(process.argv[2], 10) : DEFAULT_PORT;

	if (Number.isNaN(port)) {
		console.error("无效的端口号");
		process.exit(1);
	}

	console.log(`正在停止端口 ${port} 的服务器...`);

	const pid = await readLock(port);

	if (!pid) {
		console.log(`端口 ${port} 没有运行中的服务器`);
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

main();
