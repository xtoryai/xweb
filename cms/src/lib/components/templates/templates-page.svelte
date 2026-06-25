<script>
  import { _ } from '@sveltia/i18n';
  import { Icon, Menu, MenuItem, Spacer, Toolbar } from '@sveltia/ui';
  import { onMount } from 'svelte';

  import PageContainerMainArea from '$lib/components/common/page-container-main-area.svelte';
  import PageContainer from '$lib/components/common/page-container.svelte';
  import { user } from '$lib/services/user/account.svelte';
  import * as TemplatesAPI from '$lib/services/templates/api';

  /** @type {Array<{name: string, label: string, version: string, type: string, isActive: boolean, source: string, description: string, author: string, supports: string[]}>} */
  let templates = $state([]);
  let activeTemplate = $state('');
  let loading = $state(true);
  let actionInProgress = $state('');
  let errorMessage = $state('');

  onMount(() => {
    loadTemplates();
  });

  async function loadTemplates() {
    loading = true;
    errorMessage = '';
    try {
      const data = await TemplatesAPI.fetchTemplates();
      templates = data.templates || [];
      activeTemplate = data.active || '';
    } catch (e) {
      errorMessage = e.message || 'Failed to load templates';
    } finally {
      loading = false;
    }
  }

  async function handleActivate(name) {
    if (!confirm(`Activate template "${name}"? The site will need to be rebuilt.`)) return;
    actionInProgress = name;
    errorMessage = '';
    try {
      await TemplatesAPI.activateTemplate(name);
      activeTemplate = name;
      // Reload the page to refresh CMS config
      window.location.reload();
    } catch (e) {
      errorMessage = e.message || 'Activation failed';
      actionInProgress = '';
    }
  }

  async function handleUninstall(name) {
    if (!confirm(`Uninstall template "${name}"? This cannot be undone.`)) return;
    actionInProgress = name;
    errorMessage = '';
    try {
      await TemplatesAPI.uninstallTemplate(name);
      templates = templates.filter(t => t.name !== name);
    } catch (e) {
      errorMessage = e.message || 'Uninstall failed';
    } finally {
      actionInProgress = '';
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
          <button
            class="refresh-btn"
            onclick={loadTemplates}
            disabled={loading}
            aria-label="Refresh"
          >
            <Icon name="refresh" />
          </button>
        </Toolbar>
      {/snippet}

      {#snippet mainContent()}
        <div class="templates-page">
          {#if errorMessage}
            <div class="error-banner">
              <Icon name="error" /> {errorMessage}
              <button onclick={() => (errorMessage = '')}>&times;</button>
            </div>
          {/if}

          {#if loading}
            <div class="loading">Loading templates...</div>
          {:else}
            <!-- Active Template -->
            <section class="section">
              <h3>当前模板</h3>
              {#if activeTemplate}
                {@const active = templates.find(t => t.name === activeTemplate)}
                {#if active}
                  <div class="template-card active">
                    <div class="card-body">
                      <div class="card-icon"><Icon name="widgets" /></div>
                      <div class="card-info">
                        <h4>{active.label}</h4>
                        <p class="card-meta">
                          <span class="version">v{active.version}</span>
                          <span class="type-badge">{active.type}</span>
                          {#if active.author}<span class="author">by {active.author}</span>{/if}
                        </p>
                        {#if active.description}
                          <p class="card-desc">{active.description}</p>
                        {/if}
                        {#if active.supports?.length}
                          <p class="card-supports">
                            内容类型: {active.supports.join(', ')}
                          </p>
                        {/if}
                      </div>
                    </div>
                    <div class="card-badge">已激活</div>
                  </div>
                {/if}
              {:else}
                <p class="empty">未找到激活的模板</p>
              {/if}
            </section>

            <!-- Installed Templates -->
            <section class="section">
              <h3>已安装模板</h3>
              {#if templates.length > 0}
                <div class="template-list">
                  {#each templates as tpl (tpl.name)}
                    <div class="template-card" class:active={tpl.isActive}>
                      <div class="card-body">
                        <div class="card-icon"><Icon name="extension" /></div>
                        <div class="card-info">
                          <h4>{tpl.label}</h4>
                          <p class="card-meta">
                            <span class="version">v{tpl.version}</span>
                            <span class="type-badge">{tpl.type}</span>
                            <span class="source-badge">{tpl.source}</span>
                          </p>
                          {#if tpl.description}
                            <p class="card-desc">{tpl.description}</p>
                          {/if}
                        </div>
                      </div>
                      <div class="card-actions">
                        {#if !tpl.isActive}
                          <button
                            class="btn btn-activate"
                            onclick={() => handleActivate(tpl.name)}
                            disabled={actionInProgress === tpl.name}
                          >
                            {actionInProgress === tpl.name ? '激活中...' : '启用'}
                          </button>
                        {/if}
                        {#if tpl.source !== 'builtin' && !tpl.isActive}
                          <button
                            class="btn btn-uninstall"
                            onclick={() => handleUninstall(tpl.name)}
                            disabled={actionInProgress === tpl.name}
                          >
                            卸载
                          </button>
                        {/if}
                      </div>
                    </div>
                  {/each}
                </div>
              {:else}
                <p class="empty">没有安装其他模板</p>
              {/if}
            </section>

            <!-- Template Market (placeholder) -->
            <section class="section">
              <h3>模板市场</h3>
              <p class="empty">
                模板市场即将上线。在此之前，你可以通过 npm 安装模板：
                <br />
                <code>npm install @xtcms/template-enterprise</code>
              </p>
            </section>
          {/if}
        </div>
      {/snippet}
    </PageContainerMainArea>
  {/snippet}
</PageContainer>

<style>
  .templates-page {
    overflow-y: auto;
    height: 100%;
    padding: 24px;
  }
  .section {
    margin-bottom: 32px;
  }
  .section h3 {
    font-size: 14px;
    font-weight: 600;
    color: var(--sui-secondary-foreground-color);
    margin-bottom: 12px;
    padding-bottom: 8px;
    border-bottom: 1px solid var(--sui-border-color);
  }
  .template-card {
    display: flex;
    align-items: center;
    justify-content: space-between;
    padding: 16px;
    border: 1px solid var(--sui-border-color);
    border-radius: 8px;
    margin-bottom: 8px;
    background: var(--sui-primary-background-color);
    transition: border-color 0.2s;
  }
  .template-card.active {
    border-color: var(--sui-accent-color, #0066cc);
    background: var(--sui-highlight-background-color, #f0f7ff);
  }
  .template-card:hover {
    border-color: var(--sui-accent-color, #888);
  }
  .card-body {
    display: flex;
    align-items: flex-start;
    gap: 14px;
    flex: 1;
  }
  .card-icon {
    padding-top: 2px;
    color: var(--sui-secondary-foreground-color);
  }
  .card-info h4 {
    font-size: 15px;
    font-weight: 600;
    margin: 0 0 4px 0;
  }
  .card-meta {
    display: flex;
    align-items: center;
    gap: 8px;
    flex-wrap: wrap;
    margin: 0 0 4px 0;
    font-size: 12px;
    color: var(--sui-secondary-foreground-color);
  }
  .version {
    font-family: monospace;
    background: var(--sui-tertiary-background-color);
    padding: 1px 6px;
    border-radius: 3px;
  }
  .type-badge {
    background: var(--sui-tertiary-background-color);
    padding: 1px 8px;
    border-radius: 10px;
    font-weight: 500;
  }
  .source-badge {
    color: var(--sui-secondary-foreground-color);
  }
  .card-desc {
    font-size: 13px;
    color: var(--sui-secondary-foreground-color);
    margin: 4px 0 0 0;
    line-height: 1.5;
  }
  .card-supports {
    font-size: 12px;
    color: var(--sui-secondary-foreground-color);
    margin: 4px 0 0 0;
  }
  .card-badge {
    font-size: 11px;
    font-weight: 600;
    color: var(--sui-accent-color, #0066cc);
    background: var(--sui-highlight-background-color, #e6f0ff);
    padding: 4px 10px;
    border-radius: 12px;
    white-space: nowrap;
  }
  .card-actions {
    display: flex;
    gap: 8px;
    margin-left: 16px;
  }
  .btn {
    padding: 6px 16px;
    border-radius: 6px;
    border: 1px solid var(--sui-border-color);
    background: var(--sui-primary-background-color);
    color: var(--sui-primary-foreground-color);
    font-size: 13px;
    cursor: pointer;
    white-space: nowrap;
  }
  .btn:hover { background: var(--sui-tertiary-background-color); }
  .btn:disabled { opacity: 0.5; cursor: not-allowed; }
  .btn-activate {
    background: var(--sui-accent-color, #0066cc);
    color: white;
    border-color: var(--sui-accent-color, #0066cc);
  }
  .btn-activate:hover { opacity: 0.9; }
  .btn-uninstall {
    color: #d4380d;
    border-color: #ffccc7;
  }
  .btn-uninstall:hover { background: #fff2f0; }
  .refresh-btn {
    background: none;
    border: none;
    cursor: pointer;
    color: var(--sui-secondary-foreground-color);
    padding: 4px;
    border-radius: 4px;
  }
  .refresh-btn:hover { background: var(--sui-tertiary-background-color); }
  .refresh-btn:disabled { opacity: 0.3; cursor: not-allowed; }
  .error-banner {
    display: flex;
    align-items: center;
    gap: 8px;
    padding: 10px 16px;
    margin-bottom: 16px;
    background: #fff2f0;
    border: 1px solid #ffccc7;
    border-radius: 6px;
    color: #d4380d;
    font-size: 13px;
  }
  .error-banner button {
    margin-left: auto;
    background: none;
    border: none;
    color: #d4380d;
    font-size: 16px;
    cursor: pointer;
  }
  .loading {
    text-align: center;
    padding: 40px;
    color: var(--sui-secondary-foreground-color);
  }
  .empty {
    text-align: center;
    padding: 24px;
    color: var(--sui-secondary-foreground-color);
    font-size: 13px;
  }
  .empty code {
    background: var(--sui-tertiary-background-color);
    padding: 2px 8px;
    border-radius: 3px;
    font-size: 12px;
  }
</style>
