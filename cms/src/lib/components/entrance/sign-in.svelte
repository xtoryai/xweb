<script>
  import { _ } from '@sveltia/i18n';
  import { Button, Icon, PromptDialog, Spacer } from '@sveltia/ui';
  import { onMount } from 'svelte';

  import { allBackendServices } from '$lib/services/backends';
  import { cmsConfig } from '$lib/services/config';
  import { auth, signInAutomatically, signInManually } from '$lib/services/user/auth.svelte';
  import { env } from '$lib/services/user/env.svelte';
  import { makeLink } from '$lib/services/utils/string';

  /**
   * @import { Backend, GitBackend, GiteaBackend } from '$lib/types/public';
   */

  let showTokenDialog = $state(false);
  let token = $state('');
  let serverApiUsername = $state('');
  let serverApiPassword = $state('');
  let serverApiError = $state('');
  let serverApiLoading = $state(false);

  async function handleServerApiLogin() {
    serverApiError = '';
    serverApiLoading = true;
    try {
      const r = await fetch('/api/cms/auth', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username: serverApiUsername, password: serverApiPassword }),
      });
      if (!r.ok) {
        const d = await r.json();
        serverApiError = d.error || '认证失败';
        return;
      }
      const d = await r.json();
      await signInManually(backendName, d.token);
    } catch (ex) {
      serverApiError = ex.message;
    } finally {
      serverApiLoading = false;
    }
  }

  const configuredBackend = $derived(/** @type {Backend} */ ($cmsConfig?.backend));
  const backendName = $derived(/** @type {string} */ (configuredBackend.name));
  const backend = $derived(backendName ? allBackendServices[backendName] : null);
  const isTestRepo = $derived(backendName === 'test-repo');
  const repositoryName = $derived(
    isTestRepo ? undefined : /** @type {GitBackend} */ (configuredBackend)?.repo?.split('/').pop(),
  );
  const showLocalBackendOption = $derived(env.isLocalHost && !isTestRepo);
  const tokenAuthDisabled = $derived(
    !isTestRepo &&
      /** @type {GitBackend} */ (configuredBackend).auth_methods?.includes('token') === false,
  );

  const signInServiceLabel = $derived.by(() => {
    if (
      backendName === 'gitea' &&
      /** @type {GiteaBackend} */ (configuredBackend).base_url === 'https://codeberg.org'
    ) {
      return 'Codeberg';
    }
    return backend?.label;
  });

  const signInDisabled = $derived.by(() => {
    if (
      !isTestRepo &&
      /** @type {GitBackend} */ (configuredBackend).auth_methods?.includes('oauth') === false
    ) {
      return true;
    }
    if (backendName === 'gitea' && !(/** @type {GiteaBackend} */ (configuredBackend).app_id)) {
      return true;
    }
    return false;
  });

  onMount(() => {
    if (!auth.signInError.message) {
      signInAutomatically();
    }
  });
</script>

<div role="none" class="buttons">
  {#if auth.signingIn}
    <div role="alert" class="message">{_('signing_in')}</div>
  {:else if backend}
    {#if backendName === 'server-api'}
      <div role="none" class="form">
        <label class="field">
          <span class="label-text">用户名</span>
          <input
            type="text"
            bind:value={serverApiUsername}
            placeholder="请输入用户名"
            class="input"
            autocomplete="username"
            onkeydown={(e) => { if (e.key === 'Enter') document.getElementById('sapi-pwd')?.focus(); }}
          />
        </label>
        <label class="field">
          <span class="label-text">密码</span>
          <input
            id="sapi-pwd"
            type="password"
            bind:value={serverApiPassword}
            placeholder="请输入密码"
            class="input"
            autocomplete="current-password"
            onkeydown={(e) => { if (e.key === 'Enter') handleServerApiLogin(); }}
          />
        </label>
        {#if serverApiError}
          <div role="alert" class="form-error">{serverApiError}</div>
        {/if}
        <button
          class="submit-btn"
          disabled={!serverApiUsername.trim() || !serverApiPassword || serverApiLoading}
          onclick={handleServerApiLogin}
        >
          {serverApiLoading ? '登录中...' : '登 录'}
        </button>
      </div>
    {:else}
      {#if showLocalBackendOption}
        <Button
          variant="primary"
          label={_('work_with_local_repo')}
          disabled={!env.isLocalBackendSupported}
          onclick={async () => {
            await signInManually('local');
          }}
        />
        {#if !env.isLocalBackendSupported}
          <div role="alert">
            {#if env.isBrave}
              {@html makeLink(
                _('local_workflow.disabled'),
                'https://sveltiacms.app/en/docs/workflows/local#enabling-file-system-access-api-in-brave',
              )}
            {:else}
              {_('local_workflow.unsupported_browser')}
            {/if}
          </div>
        {:else if !auth.signInError.message}
          <div role="none">
            {#if repositoryName}
              {_('work_with_local_repo_description', { values: { repo: repositoryName } })}
            {:else}
              {_('work_with_local_repo_description_no_repo')}
            {/if}
          </div>
        {/if}
        <Spacer />
      {/if}
      <Button
        variant={showLocalBackendOption ? 'secondary' : 'primary'}
        label={isTestRepo
          ? _('work_with_test_repo')
          : _('sign_in_with_x', { values: { service: signInServiceLabel } })}
        disabled={signInDisabled}
        onclick={async () => {
          await signInManually(backendName);
        }}
      />
      {#if !isTestRepo}
        <Button
          variant="secondary"
          label={_('sign_in_using_access_token', { values: { service: signInServiceLabel } })}
          disabled={tokenAuthDisabled}
          onclick={() => {
            showTokenDialog = true;
          }}
        />
      {/if}
    {/if}
  {/if}
  {#if auth.signInError.message && auth.signInError.context === 'authentication'}
    <div role="alert" class="error iconic">
      <Icon name="error" />
      {auth.signInError.message}
    </div>
  {/if}
</div>

<PromptDialog
  bind:open={showTokenDialog}
  bind:value={token}
  title={_('sign_in_using_access_token')}
  textboxAttrs={{ spellcheck: false, 'aria-label': _('personal_access_token') }}
  okLabel={_('sign_in')}
  okDisabled={!token.trim()}
  onOk={async () => {
    await signInManually(backendName, token.trim());
  }}
>
  {_('sign_in_using_access_token_description')}
  {#if backend?.repository?.tokenPageURL}
    {@html makeLink(
      _('sign_in_using_access_token_link', { values: { service: signInServiceLabel } }),
      backend.repository.tokenPageURL,
    )}
  {/if}
</PromptDialog>

<style>
  .buttons {
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: 12px;

    :global {
      .button {
        width: 320px;
      }
    }
  }

  /* Server-API login form */
  .form {
    display: flex;
    flex-direction: column;
    gap: 16px;
    width: 100%;
  }

  .field {
    display: flex;
    flex-direction: column;
    gap: 6px;
  }

  .label-text {
    font-size: 13px;
    font-weight: 500;
    color: #555;
  }

  .input {
    width: 100%;
    padding: 11px 14px;
    border: 1px solid #d9d9d9;
    border-radius: 6px;
    font-size: 14px;
    line-height: 1.5;
    color: #1a1a1a;
    background: #fff;
    outline: none;
    transition: border-color .2s, box-shadow .2s;
    box-sizing: border-box;
  }

  .input:focus {
    border-color: #333;
    box-shadow: 0 0 0 2px rgba(0,0,0,.06);
  }

  .input::placeholder {
    color: #bbb;
  }

  .form-error {
    padding: 10px 14px;
    background: #fff2f0;
    border: 1px solid #ffccc7;
    border-radius: 6px;
    font-size: 13px;
    color: #cf1322;
    text-align: center;
  }

  .submit-btn {
    width: 100%;
    padding: 11px 0;
    margin-top: 4px;
    border: none;
    border-radius: 6px;
    background: #1a1a1a;
    color: #fff;
    font-size: 15px;
    font-weight: 500;
    letter-spacing: 4px;
    cursor: pointer;
    transition: background .2s, opacity .2s;
  }

  .submit-btn:hover {
    background: #333;
  }

  .submit-btn:disabled {
    background: #bbb;
    cursor: not-allowed;
    opacity: .7;
  }

  [role='alert'] {
    &.iconic {
      display: flex;
      align-items: center;
      gap: 8px;
    }

    &.error {
      color: var(--sui-error-foreground-color);
    }
  }
</style>
