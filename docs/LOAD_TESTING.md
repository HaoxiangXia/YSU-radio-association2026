# 入会申请接口隔离压测说明

本说明用于复现入会申请高峰测试。压测会写入数据，**只能指向使用临时配置和空数据库的回环服务**，不得对正式数据库或公网域名执行。

本项目是校园招新系统。压测用于确认现有单容器、单 Uvicorn 进程和 SQLite WAL 是否够用，不用于追求企业级吞吐指标，也不应因此引入 Redis、多进程或更换数据库。

## 测试覆盖范围

`scripts/ops/load_test_applications.py` 会：

1. 使用负责人测试账号建立会话；
2. 模拟指定数量的不同来源 IP，同时提交字段合法、学号唯一的伪造入会申请；
3. 写入期间循环读取负责人列表、统计和 CSV 导出接口；
4. 输出状态码、吞吐量、p50/p95/p99 延迟和最终 API/CSV 数量；
5. 仅在全部写入为 201、负责人读取全部为 200、最终数量一致时返回成功。

脚本强制要求 `--base-url` 使用 HTTP 回环 IP，例如 `http://127.0.0.1:5055`，避免误打正式公网服务。

## 推荐执行方式

使用与生产相同的镜像，但挂载独立临时目录：

- 临时 `DATABASE_PATH` 指向空 SQLite 文件；
- 临时 `RECRUITMENT_CONFIG_PATH` 打开申请且时间窗覆盖测试时刻；
- 临时 `ADMISSIONS_DATA_PATH` 至少包含一条符合结构的测试记录；
- 使用一次性的 `JWT_SECRET`、负责人测试账号和密码；
- 容器端口只发布到 `127.0.0.1:5055`；
- 保持与生产相同的单进程和 512 MiB 内存限制。

先执行20并发预检：

```bash
python3 scripts/ops/load_test_applications.py \
  --base-url http://127.0.0.1:5055 \
  --count 20 \
  --username loadtest-officer \
  --password '<临时测试密码>'
```

预检通过后，重新创建空数据库，再执行500并发：

```bash
python3 scripts/ops/load_test_applications.py \
  --base-url http://127.0.0.1:5055 \
  --count 500 \
  --workers 500 \
  --username loadtest-officer \
  --password '<临时测试密码>' \
  --timeout 30
```

## 通过标准

- 写入全部返回 201；
- 没有 429、5xx、超时或连接错误；
- 并发负责人列表、统计和导出全部返回 200；
- 列表、统计和 CSV 数量均等于测试数量；
- SQLite `PRAGMA quick_check` 为 `ok`，学号没有重复；
- 容器日志没有 `Traceback`、`database is locked`、ERROR 或 OOM；
- 正式容器在测试后仍健康、无重启，备份状态正常。

## 测试边界

每个提交使用 RFC 2544 测试网段中的独立模拟 IP，因此该测试验证的是“不同来源学生同时提交”。它不能证明大量学生共用一个校园网 NAT 出口时不会触发每 IP 限流。

如果确有现场统一连接校园 Wi-Fi 并集中提交的安排，再单独评估或临时调整入会申请限流阈值；普通分散招新不需要进一步扩展架构。

2026-08-12 的实际服务器结果见 [500 并发隔离压测报告](LOAD_TESTING_REPORT_2026-08-12.md)。
