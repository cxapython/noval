# V5 可视化爬虫升级 - RFC文档总览

**版本**: v5.0.0  
**创建日期**: 2025-10-08  
**状态**: 规划完成，待逐步实施

---
### 注意事项：
注意开发过程使用到的测试最后别忘了删除，不要生成意义不大的md文档，简单输出个总结就行
## 📚 RFC文档列表

本次V5升级被拆分为6个独立的RFC文档，可以逐步实施：

### 📦 Phase 1: 基础架构

#### [RFC1: 元素选择器脚本](./RFC1_元素选择器脚本.md)
**文件**: `frontend/public/element-selector.js`  
**功能**: 注入到iframe的脚本，负责元素选择和高亮  
**依赖**: 无  
**预计时间**: 0.5-1天

**核心功能**:
- 鼠标悬停高亮
- 点击选择元素
- 提取元素信息
- postMessage通信

---

#### [RFC2: 智能XPath生成算法](./RFC2_智能XPath生成算法.md)
**文件**: `frontend/src/utils/enhanced-xpath-generator.js`  
**功能**: 7种智能XPath生成策略  
**依赖**: 无  
**预计时间**: 1-1.5天

**核心功能**:
- 语义化属性策略（95%置信度）
- 稳定ID策略（90%）
- 语义化Class策略（85%）
- 结构化路径策略（80%）
- 属性组合策略（75%）
- 位置索引策略（65%）
- 文本匹配策略（25% - 降级）
- 动态内容过滤
- 置信度计算

---

#### [RFC3: 后端代理服务](./RFC3_后端代理服务.md)
**文件**: `backend/routes/crawler_v5.py`  
**功能**: 代理页面访问和脚本注入  
**依赖**: RFC1  
**预计时间**: 0.5-1天

**核心功能**:
- GET `/api/crawler/proxy-page` - 代理访问页面
- POST `/api/crawler/validate-xpath` - 验证XPath
- 自动注入element-selector.js
- CORS处理

---

### 🎨 Phase 2: 前端组件

#### [RFC4: 可视化选择器组件](./RFC4_可视化选择器组件.md)
**文件**: `frontend/src/components/VisualXPathSelector/`  
**功能**: 可视化选择器Modal界面  
**依赖**: RFC1, RFC2, RFC3  
**预计时间**: 1-1.5天

**核心功能**:
- Modal界面（左右分栏）
- iframe页面加载
- 当前选择面板
- XPath候选列表
- 已选字段管理
- postMessage通信处理

---

#### [RFC5: ConfigWizard集成方案](./RFC5_ConfigWizard集成方案.md)
**文件**: `frontend/src/pages/ConfigWizard.jsx` (修改)  
**功能**: 将可视化选择器集成到配置向导  
**依赖**: RFC1-4  
**预计时间**: 0.5-1天

**核心功能**:
- 添加可视化选择器入口按钮
- 实现字段确认回调
- 智能配置属性提取
- 自动填充XPath
- 保持向后兼容

---

### ✅ Phase 3: 测试和发布

#### [RFC6: 测试、部署和发布指南](./RFC6_测试部署指南.md)
**功能**: 完整的测试计划和部署流程  
**依赖**: RFC1-5  
**预计时间**: 1-1.5天

**核心内容**:
- 单元测试
- 集成测试
- 端到端测试
- 性能测试
- 向后兼容性测试
- 部署步骤
- 发布检查清单
- 用户文档更新

---

## 🗓️ 实施计划

### 总体时间规划

| Phase | RFC | 预计时间 | 状态 |
|-------|-----|---------|------|
| Phase 1 | RFC1 | 0.5-1天 | ✅ 已完成 |
| Phase 1 | RFC2 | 1-1.5天 | ⏳ 待开始 |
| Phase 1 | RFC3 | 0.5-1天 | ⏳ 待开始 |
| Phase 2 | RFC4 | 1-1.5天 | ⏳ 待开始 |
| Phase 2 | RFC5 | 0.5-1天 | ⏳ 待开始 |
| Phase 3 | RFC6 | 1-1.5天 | ⏳ 待开始 |
| **总计** | | **5-7.5天** | |

### 推荐实施顺序

```
步骤1: RFC1 + RFC2 并行开发（1.5-2天）
  ↓
步骤2: RFC3 开发和测试（0.5-1天）
  ↓
步骤3: RFC4 开发（1-1.5天）
  ↓
步骤4: RFC5 集成（0.5-1天）
  ↓
步骤5: RFC6 测试和发布（1-1.5天）
```

---

## 🎯 成功标准

### 功能标准
- ✅ 用户可以在真实页面上点击元素
- ✅ 自动生成7种XPath策略
- ✅ 每个策略显示置信度
- ✅ 支持多字段选择
- ✅ 自动配置属性提取
- ✅ 与ConfigWizard完美集成

### 质量标准
- ✅ XPath准确率 > 95%
- ✅ XPath通用性良好
- ✅ 页面加载 < 10秒
- ✅ UI响应流畅
- ✅ 向后完全兼容

### 用户体验标准
- ✅ 配置效率提升3-5倍
- ✅ 界面直观易用
- ✅ 错误提示友好
- ✅ 降级方案完善

---

## 📝 使用示例

### 场景1: 快速配置小说爬虫

```
用户: 我要配置一个新的小说网站爬虫
    ↓
[按照RFC5的流程]
1. 进入ConfigWizard
2. 输入小说详情页URL
3. 点击"渲染页面"
4. 点击"打开可视化元素选择器"
5. 在页面上点击标题 → 自动生成7种XPath → 选择推荐策略
6. 点击作者 → 自动生成XPath
7. 点击封面 → 自动识别需要src属性
8. 完成选择 → 所有字段自动填充
9. 保存配置
    ↓
结果: 3分钟完成配置（传统方式需要10-15分钟）
```

---

## 🔗 相关文档

### 主RFC文档
- [V5_可视化爬虫升级_RFC.md](../V5_可视化爬虫升级_RFC.md) - 完整的技术RFC

### 参考项目
- VisualSpider4AI - 可视化爬虫参考
- EasySpider - 元素选择参考

### 技术文档
- [MDN: postMessage API](https://developer.mozilla.org/en-US/docs/Web/API/Window/postMessage)
- [W3C: XPath Specification](https://www.w3.org/TR/xpath-31/)
- [Playwright Documentation](https://playwright.dev/python/)

---

## 📦 交付清单

### 代码文件
- [x] `frontend/public/element-selector.js`
- [ ] `frontend/src/utils/enhanced-xpath-generator.js`
- [ ] `backend/routes/crawler_v5.py`
- [ ] `frontend/src/components/VisualXPathSelector/`
- [ ] `frontend/src/pages/ConfigWizard.jsx` (修改)

### 测试文件
- [ ] 单元测试
- [ ] 集成测试
- [ ] 端到端测试

### 文档
- [ ] README.md (更新)
- [ ] 功能说明.md (更新)
- [ ] 用户使用指南
- [ ] API文档
- [ ] CHANGELOG.md

---

## 🚀 快速开始

### 开发者

```bash
# 1. 查看RFC文档
cd docs/v5-rfcs
cat RFC1_元素选择器脚本.md

# 2. 按顺序实施
# 从RFC1开始...

# 3. 每完成一个RFC，运行测试
npm test
pytest

# 4. 提交代码
git commit -m "feat: 完成RFC1 - 元素选择器脚本"
```

### 用户

等待V5.0.0发布后：

```bash
# 1. 更新代码
git pull origin main

# 2. 安装依赖
npm install
pip install -r requirements.txt

# 3. 启动应用
./start.sh

# 4. 访问可视化爬虫配置
打开浏览器 → http://localhost:3000/crawler
```

---

## 💡 注意事项

### 开发建议
1. **严格按照RFC顺序实施** - 后续RFC依赖前面的RFC
2. **完成一个RFC后再开始下一个** - 避免返工
3. **及时运行测试** - 确保质量
4. **保持代码整洁** - 注释清晰，命名规范

### 兼容性保证
1. **不破坏现有功能** - 所有原有功能必须保持可用
2. **降级方案** - 可视化选择器失败时可回退
3. **配置兼容** - 现有配置文件继续可用

---

## 📞 联系方式

如有问题或建议，请通过以下方式联系：

- **GitHub Issues**: 提交Issue
- **邮件**: your-email@example.com

---

**文档版本**: v1.0  
**最后更新**: 2025-10-08  
**维护者**: AI Assistant

---

## 🎉 祝开发顺利！

期待V5.0.0的精彩表现！🚀

