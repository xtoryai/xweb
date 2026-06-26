<script>
  import { _ } from '@sveltia/i18n';
  import { Icon, Spacer, Toolbar } from '@sveltia/ui';
  import { onMount } from 'svelte';

  import PageContainerMainArea from '$lib/components/common/page-container-main-area.svelte';
  import PageContainer from '$lib/components/common/page-container.svelte';
  import * as TemplatesAPI from '$lib/services/templates/api';

  /** @type {Array<Object>} */
  let templates = $state([]);
  let activeTemplate = $state('');
  let loading = $state(true);
  let actionInProgress = $state('');

  // ── AI state ──
  let aiPrompt = $state('');
  let aiBusy = $state(false);
  let aiResult = $state(/** @type {null|Object} */ null);
  let aiError = $state('');

  onMount(() => loadTemplates());

  async function loadTemplates() {
    loading = true;
    try {
      const data = await TemplatesAPI.fetchTemplates();
      templates = data.templates || [];
      activeTemplate = data.active || '';
    } catch (e) {
      /* ignore */
    } finally {
      loading = false;
    }
  }

  async function handleActivate(name) {
    if (!confirm(`Activate template "${name}"? The site will need to be rebuilt.`)) return;
    actionInProgress = name;
    try {
      await TemplatesAPI.activateTemplate(name);
      activeTemplate = name;
      window.location.reload();
    } catch (e) {
      actionInProgress = '';
    }
  }

  async function handleUninstall(name) {
    if (!confirm(`Uninstall template "${name}"? This cannot be undone.`)) return;
    actionInProgress = name;
    try {
      await TemplatesAPI.uninstallTemplate(name);
      templates = templates.filter(t => t.name !== name);
    } catch (e) {
      /* ignore */
    } finally {
      actionInProgress = '';
    }
  }

  async function handleAISubmit() {
    if (!aiPrompt.trim() || aiBusy) return;
    aiBusy = true;
    aiError = '';
    aiResult = null;
    try {
      aiResult = await TemplatesAPI.aiAction('auto', aiPrompt.trim());
    } catch (e) {
      aiError = e.message || 'AI failed';
    } finally {
      aiBusy = false;
    }
  }

  async function handleAIApply() {
    if (!aiResult || aiBusy) return;
    aiBusy = true;
    aiError = '';
    try {
      if (aiResult.action === 'generate') {
        await TemplatesAPI.installGeneratedTemplate(aiResult.template.name, aiResult.files);
        await loadTemplates();
      } else if (aiResult.action === 'append') {
        await TemplatesAPI.applyAppend(aiResult.additions, activeTemplate);
        await loadTemplates();
      } else if (aiResult.action === 'modify') {
        await TemplatesAPI.applyModify(aiResult.filePath, aiResult.modifiedContent, activeTemplate);
      }
      aiResult = null;
      aiPrompt = '';
    } catch (e) {
      aiError = e.message || 'Apply failed';
    } finally {
      aiBusy = false;
    }
  }

  function handleKeydown(e) {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleAISubmit();
    }
  }

  function humanAction() {
    if (!aiResult) return '';
    switch (aiResult.action) {
      case 'generate': return '生成新模板';
      case 'append': return `添加到 ${aiResult.currentTemplate || activeTemplate}`;
      case 'modify': return `修改 ${aiResult.filePath || ''}`;
      default: return '';
    }
  }
</script>

<PageContainer aria-label="Templates">
  {#snippet main()}
    <PageContainerMainArea>
      {#snippet primaryToolbar()}
        <Toolbar variant="primary">
          <h2 role="none">模板管理</h2>
          <Spacer flex />
          <button class="refresh-btn" onclick={loadTemplates} disabled={loading} aria-label="Refresh">
            <Icon name="refresh" />
          </button>
        </Toolbar>
      {/snippet}

      {#snippet mainContent()}
        <div class="layout">
          <!-- Left: Template List -->
          <div class="left-panel">
            {#if loading}
              <div class="loading">Loading...</div>
            {:else}
              {#if activeTemplate}
                {@const active = templates.find(t => t.name === activeTemplate)}
                {#if active}
                  <div class="template-card active">
                    <div class="card-body">
                      <span class="card-icon"><Icon name="widgets" /></span>
                      <div>
                        <h4>{active.label}</h4>
                        <p class="meta">v{active.version} · {active.type} · {active.source}</p>
                      </div>
                    </div>
                    <span class="badge-active">已激活</span>
                  </div>
                {/if}
              {:else}
                <p class="empty">未找到激活的模板</p>
              {/if}

              <h3 class="section-title">已安装 ({templates.length})</h3>
              {#each templates as tpl (tpl.name)}
                <div class="template-card" class:active={tpl.isActive}>
                  <div class="card-body">
                    <span class="card-icon"><Icon name="extension" /></span>
                    <div style="flex:1">
                      <h4>{tpl.label}</h4>
                      <p class="meta">v{tpl.version} · {tpl.type}</p>
                      {#if tpl.description}<p class="desc">{tpl.description}</p>{/if}
                    </div>
                  </div>
                  {#if !tpl.isActive}
                    <div class="card-actions">
                      <button class="btn-sm primary" onclick={() => handleActivate(tpl.name)} disabled={actionInProgress === tpl.name}>
                        {actionInProgress === tpl.name ? '...' : '启用'}
                      </button>
                      {#if tpl.source !== 'builtin'}
                        <button class="btn-sm danger" onclick={() => handleUninstall(tpl.name)} disabled={actionInProgress === tpl.name}>卸载</button>
                      {/if}
                    </div>
                  {/if}
                </div>
              {/each}

              <div class="market-hint">
                <p>npm install @xtcms/template-xxx</p>
              </div>
            {/if}
          </div>

          <!-- Right: AI Assistant -->
          <div class="right-panel">
            <h3 class="section-title">🤖 AI 助手</h3>

            <div class="ai-box">
              <textarea
                class="ai-input"
                bind:value={aiPrompt}
                placeholder="描述你想要的网站或改动，AI 会自动判断是新建、添加还是修改...&#10;&#10;比如：&#10;· 「做一个律师事务所网站，有律师团队和案例展示」&#10;· 「给当前网站加一个 FAQ 页面」&#10;· 「把首页主色调改成深蓝色」"
                rows="4"
                onkeydown={handleKeydown}
                disabled={aiBusy}
              ></textarea>
              <div class="ai-bar">
                <span class="ai-hint">Enter 发送 · Shift+Enter 换行</span>
                <button class="ai-btn" onclick={handleAISubmit} disabled={aiBusy || !aiPrompt.trim()}>
                  {#if aiBusy}
                    <span class="spinner"></span> 思考中...
                  {:else}
                    ✨ 执行
                  {/if}
                </button>
              </div>
            </div>

            {#if aiError}
              <div class="toast error">{aiError}</div>
            {/if}

            {#if aiResult}
              <div class="ai-result">
                <div class="result-head">
                  <span class="action-badge">{humanAction()}</span>
                  <div class="result-btns">
                    <button class="btn-sm primary" onclick={handleAIApply} disabled={aiBusy}>
                      {aiBusy ? '应用中...' : '✓ 应用'}
                    </button>
                    <button class="btn-sm" onclick={() => (aiResult = null)}>取消</button>
                  </div>
                </div>

                <!-- Generate result -->
                {#if aiResult.action === 'generate'}
                  {@const tpl = aiResult.template}
                  <div class="result-meta">
                    <strong>{tpl.label || tpl.name}</strong> · v{tpl.version} · extends {tpl.extends || 'blog'}
                    {#if tpl.supports?.length}<p>内容: {tpl.supports.join(', ')}</p>{/if}
                  </div>
                  {#if !aiResult.validation.valid}
                    <div class="warn">⚠ {aiResult.validation.errors.length} 个问题可忽略</div>
                  {/if}
                  <details class="yaml-block">
                    <summary>template.yml</summary>
                    <pre><code>{aiResult.files['template.yml']}</code></pre>
                  </details>
                  <details class="yaml-block">
                    <summary>collections.yml</summary>
                    <pre><code>{aiResult.files['collections.yml']}</code></pre>
                  </details>

                <!-- Append result -->
                {:else if aiResult.action === 'append'}
                  <div class="result-meta">
                    向 <strong>{aiResult.currentTemplate}</strong> 添加模块
                    {#if aiResult.additions.pages}
                      <p>新页面: {Object.keys(aiResult.additions.pages).join(', ')}</p>
                    {/if}
                  </div>
                  {#if !aiResult.validation.valid}
                    <div class="warn">⚠ {aiResult.validation.errors.length} 个问题可忽略</div>
                  {/if}
                  <details class="yaml-block">
                    <summary>新增 collections</summary>
                    <pre><code>{aiResult.additions.collectionsYAML}</code></pre>
                  </details>
                  {#if aiResult.additions.templateYAML}
                    <details class="yaml-block">
                      <summary>更新 template.yml</summary>
                      <pre><code>{aiResult.additions.templateYAML}</code></pre>
                    </details>
                  {/if}

                <!-- Modify result -->
                {:else if aiResult.action === 'modify'}
                  <div class="result-meta">
                    修改 <code>{aiResult.filePath}</code>
                  </div>
                  <div class="diff-grid">
                    <div>
                      <p class="diff-label">修改前</p>
                      <pre class="diff-code"><code>{aiResult.currentContent}</code></pre>
                    </div>
                    <div>
                      <p class="diff-label">修改后</p>
                      <pre class="diff-code"><code>{aiResult.modifiedContent}</code></pre>
                    </div>
                  </div>
                {/if}
              </div>
            {/if}
          </div>
        </div>
      {/snippet}
    </PageContainerMainArea>
  {/snippet}
</PageContainer>

<style>
  .layout { display: flex; gap: 0; height: 100%; }
  .left-panel { width: 600px; flex-shrink: 0; overflow-y: auto; padding: 20px; border-right: 1px solid var(--sui-border-color); }
  .right-panel { flex: 1; overflow-y: auto; padding: 20px; display: flex; flex-direction: column; }

  .section-title { font-size: 13px; font-weight: 600; color: var(--sui-secondary-foreground-color); margin-bottom: 12px; padding-bottom: 8px; border-bottom: 1px solid var(--sui-border-color); }

  /* ── Template cards ── */
  .template-card {
    display: flex; align-items: center; justify-content: space-between;
    padding: 10px 12px; border: 1px solid var(--sui-border-color); border-radius: 6px;
    margin-bottom: 6px; background: var(--sui-primary-background-color);
  }
  .template-card.active { border-color: var(--sui-accent-color, #0066cc); background: #f0f7ff; }
  .card-body { display: flex; align-items: center; gap: 10px; flex: 1; min-width: 0; }
  .card-body h4 { font-size: 13px; font-weight: 600; margin: 0; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
  .card-icon { color: var(--sui-secondary-foreground-color); flex-shrink: 0; }
  .meta { font-size: 11px; color: var(--sui-secondary-foreground-color); margin: 2px 0 0 0; }
  .desc { font-size: 11px; color: var(--sui-secondary-foreground-color); margin: 2px 0 0 0; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
  .card-actions { display: flex; gap: 4px; margin-left: 8px; flex-shrink: 0; }
  .badge-active {
    font-size: 10px; font-weight: 600; color: var(--sui-accent-color, #0066cc);
    background: #e6f0ff; padding: 2px 8px; border-radius: 10px; white-space: nowrap; flex-shrink: 0;
  }
  .btn-sm {
    padding: 4px 10px; border-radius: 4px; border: 1px solid var(--sui-border-color);
    background: var(--sui-primary-background-color); color: var(--sui-primary-foreground-color);
    font-size: 11px; cursor: pointer; white-space: nowrap;
  }
  .btn-sm.primary { background: var(--sui-accent-color, #0066cc); color: white; border-color: var(--sui-accent-color, #0066cc); }
  .btn-sm.danger { color: #d4380d; border-color: #ffccc7; }
  .btn-sm:hover { opacity: 0.8; }
  .btn-sm:disabled { opacity: 0.4; cursor: not-allowed; }
  .refresh-btn { background: none; border: none; cursor: pointer; color: var(--sui-secondary-foreground-color); padding: 4px; border-radius: 4px; }
  .refresh-btn:hover { background: var(--sui-tertiary-background-color); }
  .loading { text-align: center; padding: 40px; color: var(--sui-secondary-foreground-color); font-size: 13px; }
  .empty { text-align: center; padding: 20px; color: var(--sui-secondary-foreground-color); font-size: 12px; }
  .market-hint { margin-top: 16px; padding: 10px; background: var(--sui-tertiary-background-color); border-radius: 6px; }
  .market-hint p { font-size: 11px; color: var(--sui-secondary-foreground-color); margin: 0; font-family: monospace; }

  /* ── AI box ── */
  .ai-box { border: 1px solid var(--sui-border-color); border-radius: 8px; padding: 12px; background: var(--sui-primary-background-color); }
  .ai-input {
    width: 100%; border: none; outline: none; resize: vertical; font-size: 14px; font-family: inherit;
    line-height: 1.6; background: transparent; color: var(--sui-primary-foreground-color); min-height: 90px;
  }
  .ai-input::placeholder { color: #aaa; font-size: 13px; }
  .ai-input:disabled { opacity: 0.5; }
  .ai-bar { display: flex; align-items: center; justify-content: space-between; margin-top: 8px; padding-top: 8px; border-top: 1px solid var(--sui-border-color); }
  .ai-hint { font-size: 11px; color: #aaa; }
  .ai-btn {
    padding: 6px 20px; border-radius: 6px; border: none;
    background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white;
    font-size: 13px; font-weight: 500; cursor: pointer; display: flex; align-items: center; gap: 6px;
  }
  .ai-btn:hover:not(:disabled) { opacity: 0.9; }
  .ai-btn:disabled { opacity: 0.5; cursor: not-allowed; }
  .spinner { display: inline-block; width: 14px; height: 14px; border: 2px solid rgba(255,255,255,0.3); border-top-color: white; border-radius: 50%; animation: spin 0.6s linear infinite; }
  @keyframes spin { to { transform: rotate(360deg); } }

  /* ── Result ── */
  .toast { padding: 10px 14px; margin-top: 12px; border-radius: 6px; font-size: 13px; }
  .toast.error { background: #fff2f0; color: #d4380d; border: 1px solid #ffccc7; }

  .ai-result { margin-top: 16px; border: 1px solid var(--sui-border-color); border-radius: 8px; overflow: hidden; }
  .result-head {
    display: flex; align-items: center; justify-content: space-between;
    padding: 12px 14px; background: var(--sui-tertiary-background-color);
  }
  .action-badge {
    font-size: 12px; font-weight: 600; padding: 3px 10px; border-radius: 10px;
    background: linear-gradient(135deg, #667eea20 0%, #764ba220 100%); color: #667eea;
  }
  .result-btns { display: flex; gap: 6px; }
  .result-meta { padding: 10px 14px; font-size: 12px; color: var(--sui-secondary-foreground-color); border-bottom: 1px solid var(--sui-border-color); }
  .result-meta strong { color: var(--sui-primary-foreground-color); }
  .result-meta p { margin: 4px 0 0 0; }
  .warn { padding: 8px 14px; font-size: 12px; background: #fffbe6; color: #d48806; border-bottom: 1px solid var(--sui-border-color); }

  .yaml-block { border-bottom: 1px solid var(--sui-border-color); }
  .yaml-block summary { padding: 8px 14px; font-size: 12px; font-family: monospace; cursor: pointer; color: var(--sui-secondary-foreground-color); }
  .yaml-block summary:hover { color: var(--sui-primary-foreground-color); }
  .yaml-block pre { margin: 0; padding: 12px 14px; background: #1e1e1e; overflow: auto; max-height: 300px; }
  .yaml-block code { font-size: 11px; line-height: 1.5; color: #d4d4d4; white-space: pre; }

  .diff-grid { display: grid; grid-template-columns: 1fr 1fr; }
  .diff-grid > div:first-child { border-right: 1px solid var(--sui-border-color); }
  .diff-label { padding: 6px 14px; font-size: 10px; font-weight: 600; text-transform: uppercase; color: #888; background: #fafafa; margin: 0; border-bottom: 1px solid var(--sui-border-color); }
  .diff-code { margin: 0; padding: 10px 14px; overflow: auto; max-height: 400px; font-size: 11px; line-height: 1.5; white-space: pre; }
</style>
