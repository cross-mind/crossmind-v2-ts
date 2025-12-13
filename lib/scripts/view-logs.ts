import * as fs from "node:fs";
import * as path from "node:path";

const DEFAULT_PORT = 8000;

function getLogFile(port: number): string {
	return path.join(process.cwd(), `.logs/dev-server-${port}.log`);
}

async function main() {
	// 从命令行参数获取端口（可选）
	const port = process.argv[2] ? Number.parseInt(process.argv[2], 10) : DEFAULT_PORT;

	if (Number.isNaN(port)) {
		console.error("无效的端口号");
		process.exit(1);
	}

	const logFile = getLogFile(port);

	console.log(`监控日志: ${logFile} (端口 ${port})`);
	console.log("按 Ctrl+C 退出\n");

	// 读取现有内容
	try {
		const content = await fs.promises.readFile(logFile, "utf-8");
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
		const stats = await fs.promises.stat(logFile);
		lastSize = stats.size;
	} catch {}

	fs.watchFile(logFile, { interval: 500 }, async (curr) => {
		if (curr.size > lastSize) {
			const stream = fs.createReadStream(logFile, {
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
}

main();
