<script>
  import { _ } from '@sveltia/i18n';
  import { TextInput } from '@sveltia/ui';
  import { untrack } from 'svelte';

  import FieldEditorGroup from '$lib/components/contents/details/editor/field-editor-group.svelte';
  import ValidationError from '$lib/components/contents/details/editor/validation-error.svelte';
  import { entryDraft } from '$lib/services/contents/draft';
  import { DEFAULT_I18N_CONFIG } from '$lib/services/contents/i18n/config';
  import { fillTemplate } from '$lib/services/common/template';

  let {
    /* eslint-disable prefer-const */
    locale,
    /* eslint-enable prefer-const */
  } = $props();

  const fieldId = $props.id();

  const collection = $derived($entryDraft?.collection);
  const collectionFile = $derived($entryDraft?.collectionFile);
  const { defaultLocale } = $derived((collectionFile ?? collection)?._i18n ?? DEFAULT_I18N_CONFIG);
  const slugEditor = $derived($entryDraft?.slugEditor[locale]);
  const required = $derived(slugEditor === true);
  const readonly = $derived(slugEditor === 'readonly');
  const validity = $derived($entryDraft?.validities[locale]._slug);
  const invalid = $derived(!readonly && validity?.valid === false);

  const identifierField = $derived(collection?.identifier_field || 'title');
  const slugTemplate = $derived(collection?.slug || '{{title}}');

  // Auto-suggested slug from title — reactive, no side effects
  const suggestedSlug = $derived.by(() => {
    const draft = $entryDraft;
    if (!draft || readonly) return '';
    if (draft.collection?._type !== 'entry') return '';
    const title = draft.currentValues[defaultLocale]?.[identifierField];
    if (!title || typeof title !== 'string' || !title.trim()) return '';
    return fillTemplate(slugTemplate, {
      collection,
      locale: defaultLocale,
      content: { ...draft.currentValues[defaultLocale], _slug: title },
    });
  });

  let inputValue = $state('');
  let userEdited = $state(false);

  // Apply suggested slug to input when user hasn't manually edited
  $effect(() => {
    const slug = suggestedSlug;
    if (slug && !userEdited) {
      inputValue = slug;
    }
  });

  // For readonly (existing entries), populate from current slug
  $effect(() => {
    if (readonly) {
      const slug = $entryDraft?.currentSlugs[locale];
      if (slug !== undefined) inputValue = slug;
    }
  });

  // Sync inputValue → currentSlugs
  $effect(() => {
    void [inputValue];
    untrack(() => {
      const draft = $entryDraft;
      if (!draft) return;
      Object.entries(draft.slugEditor).forEach(([loc, enabled]) => {
        if (locale === loc || (locale === defaultLocale && enabled === 'readonly')) {
          draft.currentSlugs[loc] = inputValue;
        }
      });
    });
  });
</script>

{#if $entryDraft}
  <FieldEditorGroup>
    <header role="none">
      <h4 role="none" id="{fieldId}-label">{_('slug')}</h4>
      {#if required}
        <div class="required" aria-label={_('required')}>*</div>
      {/if}
    </header>
    {#if invalid}
      <ValidationError id="{fieldId}-error">
        {#if validity?.valueMissing}
          {_('validation.value_missing')}
        {/if}
      </ValidationError>
    {/if}
    <div role="none" class="field-wrapper">
      <TextInput
        dir="auto"
        bind:value={inputValue}
        flex
        {readonly}
        {required}
        {invalid}
        aria-labelledby="{fieldId}-label"
        aria-errormessage="{fieldId}-error"
      />
    </div>
  </FieldEditorGroup>
{/if}
