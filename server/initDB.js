// initDB.js
require('dotenv').config(); // 新增这一行来加载 .env 文件
const mongoose = require('mongoose');
const connectDB = require('./config/db');
const Association = require('./models/Association');
const Department = require('./models/Department');
const Competition = require('./models/Competition');
const Honor = require('./models/Honor');
const Training = require('./models/Training');

connectDB();

const initData = async () => {
  try {
    // 清空现有数据
    await Association.deleteMany();
    await Department.deleteMany();
    await Competition.deleteMany();
    await Honor.deleteMany();
    await Training.deleteMany();

    // 插入协会数据
    const association = new Association({
      name: "无线电爱好者协会",
      englishName: "Radio Enthusiasts Association",
      abbreviation: "无协",
      establishmentYear: 1988,
      motto: "挖掘潜质，就在无协",
      slogan: "无协天下天下无协",
      description: "燕山大学无线电爱好者协会是技术实践类社团，非常注重教学与实践，已经陪燕大走过36个春秋。",
      memberCount: 33,
      starRating: 5,
      awards: ["2022年河北省高校活力团支部TOP10", "燕山大学五星级社团"]
    });
    await association.save();

    // 插入部门数据
    const departments = [
      {
        name: "组织部",
        description: "主要负责协会内部大大小小的活动，包括前期策划，布置和准备工作等，也可以学到公众号运营和媒体剪辑与制作等相关知识。"
      },
      {
        name: "嵌入式部",
        description: "以嵌入式技术为主，软硬件兼修。嵌入式系统就是各种电气设备的控制器。涉及软件运行环境及其操作系统，信号处理器、存储器、通信模块等。"
      },
      {
        name: "机械部",
        description: "主要负责机械建模solidworks教学，机械制图等相关教学同时也负责部分嵌入式方面内容教学。"
      },
      {
        name: "计算机部",
        description: "主要学习与计算机有关的技术:软件、算法、Web、Linux操作系统、人工智能皆有涉及，也可以学习物理引擎对物理器械进行仿真和使用github page部署个人网站。"
      },
      {
        name: "团支部",
        description: "共有团员33人，来自不同专业，学习成绩均排名专业前百分之三十。成功组织了多次主题团日活动、主题学习会。"
      }
    ];
    await Department.insertMany(departments);

    // 插入竞赛数据
    const competitions = [
      {
        name: "展望杯嵌入式大赛",
        year: 2024,
        participants: 102,
        description: "为促进信息科学与工程学院的创新氛围，激发燕山大学大一新生的学习与创新热情，提供展示自我的平台。",
        tracks: ["嵌入式方向", "软件方向"]
      },
      {
        name: "DIY达人赛",
        year: 2024,
        participants: 62,
        description: "参赛选手们在嵌入式和算法领域展现了卓越的DIY能力，展示了各类创新作品，包括蓝牙小车、简易示波器、可视化游戏等。",
        tracks: ["软件开发创意可视化小游戏", "视觉识别", "嵌入式方向"]
      },
      {
        name: "指尖风暴大赛",
        year: 2023,
        participants: 312,
        description: "增强对C语言、单片机的掌握，激发对深度学习的兴趣，提高同学们的编程与单片机技术水平。",
        tracks: ["软件赛道", "硬件普通赛道", "自主提交作品"]
      }
    ];
    await Competition.insertMany(competitions);

    // 插入荣誉数据
    const honors = [
      {
        title: "2022年河北省高校活力团支部TOP10",
        rank: 6,
        year: 2022,
        description: "入选改革味榜单"
      },
      {
        title: "燕山大学五星级社团",
        year: 2024,
        description: "在2024年度社团评议中蝉联"
      }
    ];
    await Honor.insertMany(honors);

    // 插入培训数据
    const trainings = [
      {
        year: "2023-2024",
        type: "线下培训",
        count: 15,
        participants: 480,
        description: "面向全校同学开设公开课，分享技术知识与实践经验"
      },
      {
        year: "2024",
        type: "专业知识授课培训",
        count: 23,
        description: "提供广阔场地与专业设备"
      },
      {
        year: "2024",
        type: "线下焊接实训",
        count: 4,
        description: "无协的成员在大一时就能提前了解C语言，嵌入式知识，掌握焊接技巧"
      }
    ];
    await Training.insertMany(trainings);

    console.log('Database initialized successfully!');
    process.exit(0);
  } catch (err) {
    console.error('Error initializing database:', err);
    process.exit(1);
  }
};

initData();