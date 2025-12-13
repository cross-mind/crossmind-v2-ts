-- Seed platform frameworks (ownerId = NULL)
-- This migration inserts 5 platform-shared frameworks with their zones

-- Insert frameworks
INSERT INTO "Framework" (name, icon, description, "ownerId", visibility, "isActive", "createdAt", "updatedAt")
VALUES
  ('产品开发流程', '🚀', '从想法到上线的完整产品开发流程', NULL, 'public', true, NOW(), NOW()),
  ('商业模式画布', '🎨', '系统分析商业模式的9个核心要素', NULL, 'public', true, NOW(), NOW()),
  ('SaaS 健康度', '📊', 'SaaS 产品的关键指标和健康度分析', NULL, 'public', true, NOW(), NOW()),
  ('六顶思考帽', '🎩', '从六个不同角度全面分析问题', NULL, 'public', true, NOW(), NOW()),
  ('精益创业画布', '⚡', '快速验证创业想法的精益方法', NULL, 'public', true, NOW(), NOW());

-- Insert zones for Product Dev framework
INSERT INTO "FrameworkZone" ("frameworkId", "zoneKey", name, description, "colorKey", "displayOrder", "createdAt")
SELECT
  (SELECT id FROM "Framework" WHERE name = '产品开发流程' LIMIT 1),
  'ideation',
  '想法孵化',
  '探索和验证产品想法',
  'orange',
  0,
  NOW()
UNION ALL SELECT (SELECT id FROM "Framework" WHERE name = '产品开发流程' LIMIT 1), 'design', '设计规划', '定义产品功能和用户体验', 'blue', 1, NOW()
UNION ALL SELECT (SELECT id FROM "Framework" WHERE name = '产品开发流程' LIMIT 1), 'dev', '开发实现', '技术实现和测试', 'green', 2, NOW()
UNION ALL SELECT (SELECT id FROM "Framework" WHERE name = '产品开发流程' LIMIT 1), 'launch', '发布运营', '上线和市场推广', 'pink', 3, NOW();

-- Insert zones for Business Canvas framework
INSERT INTO "FrameworkZone" ("frameworkId", "zoneKey", name, description, "colorKey", "displayOrder", "createdAt")
SELECT
  (SELECT id FROM "Framework" WHERE name = '商业模式画布' LIMIT 1),
  'customer',
  '客户细分',
  NULL,
  'orange',
  0,
  NOW()
UNION ALL SELECT (SELECT id FROM "Framework" WHERE name = '商业模式画布' LIMIT 1), 'value', '价值主张', NULL, 'indigo', 1, NOW()
UNION ALL SELECT (SELECT id FROM "Framework" WHERE name = '商业模式画布' LIMIT 1), 'channels', '渠道通路', NULL, 'teal', 2, NOW()
UNION ALL SELECT (SELECT id FROM "Framework" WHERE name = '商业模式画布' LIMIT 1), 'relationship', '客户关系', NULL, 'purple', 3, NOW()
UNION ALL SELECT (SELECT id FROM "Framework" WHERE name = '商业模式画布' LIMIT 1), 'revenue', '收入来源', NULL, 'green', 4, NOW()
UNION ALL SELECT (SELECT id FROM "Framework" WHERE name = '商业模式画布' LIMIT 1), 'resources', '核心资源', NULL, 'amber', 5, NOW()
UNION ALL SELECT (SELECT id FROM "Framework" WHERE name = '商业模式画布' LIMIT 1), 'activities', '关键业务', NULL, 'orange', 6, NOW()
UNION ALL SELECT (SELECT id FROM "Framework" WHERE name = '商业模式画布' LIMIT 1), 'partners', '重要合作', NULL, 'pink', 7, NOW()
UNION ALL SELECT (SELECT id FROM "Framework" WHERE name = '商业模式画布' LIMIT 1), 'costs', '成本结构', NULL, 'red', 8, NOW();

-- Insert zones for SaaS Health framework
INSERT INTO "FrameworkZone" ("frameworkId", "zoneKey", name, description, "colorKey", "displayOrder", "createdAt")
SELECT
  (SELECT id FROM "Framework" WHERE name = 'SaaS 健康度' LIMIT 1),
  'growth',
  '增长指标',
  '用户增长和获客',
  'lightGreen',
  0,
  NOW()
UNION ALL SELECT (SELECT id FROM "Framework" WHERE name = 'SaaS 健康度' LIMIT 1), 'retention', '留存分析', '用户留存和流失', 'cyan', 1, NOW()
UNION ALL SELECT (SELECT id FROM "Framework" WHERE name = 'SaaS 健康度' LIMIT 1), 'monetization', '变现能力', '收入和定价策略', 'amber', 2, NOW()
UNION ALL SELECT (SELECT id FROM "Framework" WHERE name = 'SaaS 健康度' LIMIT 1), 'unit-economics', '单位经济', 'LTV/CAC 等核心指标', 'orange', 3, NOW();

-- Insert zones for Six Thinking Hats framework
INSERT INTO "FrameworkZone" ("frameworkId", "zoneKey", name, description, "colorKey", "displayOrder", "createdAt")
SELECT
  (SELECT id FROM "Framework" WHERE name = '六顶思考帽' LIMIT 1),
  'white',
  '白帽-事实',
  '客观数据和信息',
  'cyan',
  0,
  NOW()
UNION ALL SELECT (SELECT id FROM "Framework" WHERE name = '六顶思考帽' LIMIT 1), 'red', '红帽-情感', '直觉和感受', 'red', 1, NOW()
UNION ALL SELECT (SELECT id FROM "Framework" WHERE name = '六顶思考帽' LIMIT 1), 'black', '黑帽-风险', '谨慎和风险评估', 'indigo', 2, NOW()
UNION ALL SELECT (SELECT id FROM "Framework" WHERE name = '六顶思考帽' LIMIT 1), 'yellow', '黄帽-乐观', '积极面和机会', 'amber', 3, NOW()
UNION ALL SELECT (SELECT id FROM "Framework" WHERE name = '六顶思考帽' LIMIT 1), 'green', '绿帽-创意', '创造性思维', 'green', 4, NOW()
UNION ALL SELECT (SELECT id FROM "Framework" WHERE name = '六顶思考帽' LIMIT 1), 'blue', '蓝帽-控制', '流程控制和总结', 'blue', 5, NOW();

-- Insert zones for Lean Canvas framework
INSERT INTO "FrameworkZone" ("frameworkId", "zoneKey", name, description, "colorKey", "displayOrder", "createdAt")
SELECT
  (SELECT id FROM "Framework" WHERE name = '精益创业画布' LIMIT 1),
  'problem',
  '问题',
  NULL,
  'red',
  0,
  NOW()
UNION ALL SELECT (SELECT id FROM "Framework" WHERE name = '精益创业画布' LIMIT 1), 'solution', '解决方案', NULL, 'green', 1, NOW()
UNION ALL SELECT (SELECT id FROM "Framework" WHERE name = '精益创业画布' LIMIT 1), 'unique-value', '独特价值', NULL, 'amber', 2, NOW()
UNION ALL SELECT (SELECT id FROM "Framework" WHERE name = '精益创业画布' LIMIT 1), 'unfair-advantage', '壁垒优势', NULL, 'purple', 3, NOW()
UNION ALL SELECT (SELECT id FROM "Framework" WHERE name = '精益创业画布' LIMIT 1), 'customer-segments', '客户细分', NULL, 'blue', 4, NOW()
UNION ALL SELECT (SELECT id FROM "Framework" WHERE name = '精益创业画布' LIMIT 1), 'channels', '渠道', NULL, 'teal', 5, NOW()
UNION ALL SELECT (SELECT id FROM "Framework" WHERE name = '精益创业画布' LIMIT 1), 'revenue', '收入来源', NULL, 'lightGreen', 6, NOW()
UNION ALL SELECT (SELECT id FROM "Framework" WHERE name = '精益创业画布' LIMIT 1), 'cost', '成本结构', NULL, 'orange', 7, NOW()
UNION ALL SELECT (SELECT id FROM "Framework" WHERE name = '精益创业画布' LIMIT 1), 'key-metrics', '关键指标', NULL, 'indigo', 8, NOW();
