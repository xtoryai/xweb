<!--
  @component
  Shared cells (checkbox, thumbnail image, title) used by both the read-only entry list row and the
  reorder list row.
-->
<script>
  import { locale as appLocale } from '@sveltia/i18n';
  import { Checkbox, GridCell, Icon, TruncatedText } from '@sveltia/ui';

  import Image from '$lib/components/assets/shared/image.svelte';
  import { selectedEntryIdSet } from '$lib/services/contents/collection/entries';
  import {
    getIndexFile,
    isCollectionIndexFile,
  } from '$lib/services/contents/collection/entries/index-file';
  import { getEntryThumbnail } from '$lib/services/contents/entry/assets';
  import { getEntrySummary } from '$lib/services/contents/entry/summary';
  import { env } from '$lib/services/user/env.svelte';

  /**
   * @import { Entry, InternalEntryCollection, ViewType } from '$lib/types/private';
   */

  /**
   * @typedef {object} Props
   * @property {InternalEntryCollection} collection Selected collection.
   * @property {Entry} entry Entry.
   * @property {ViewType} viewType View type.
   * @property {boolean} [showCheckbox] Whether to render the selection checkbox cell. Defaults to
   * `false`; the read-only list row passes `true`, while the reorder row leaves it off.
   * @property {(selected: boolean) => void} [onSelect] Selection change handler.
   */

  /** @type {Props} */
  let {
    /* eslint-disable prefer-const */
    collection,
    entry,
    viewType,
    showCheckbox = false,
    onSelect = undefined,
    /* eslint-enable prefer-const */
  } = $props();

  /**
   * Whether this entry is pinned across any locale.
   */
  const isPinned = $derived(
    Object.values(entry.locales).some(
      (locale) => locale.content?.pinned === true,
    ),
  );
</script>

{#if showCheckbox && !(env.isSmallScreen || env.isMediumScreen)}
  <GridCell class="checkbox">
    <Checkbox
      role="none"
      tabindex="-1"
      checked={$selectedEntryIdSet.has(entry.id)}
      onChange={({ detail: { checked } }) => {
        onSelect?.(checked);
      }}
    />
  </GridCell>
{/if}
{#if collection._thumbnailFieldNames.length}
  <GridCell class="image">
    {#await getEntryThumbnail(collection, entry)}
      <div class="default-thumb"><Icon name="draft" /></div>
    {:then src}
      {#if src}
        <Image {src} variant={viewType === 'list' ? 'icon' : 'tile'} cover />
      {:else}
        <div class="default-thumb"><Icon name="draft" /></div>
      {/if}
    {:catch}
      <div class="default-thumb"><Icon name="draft" /></div>
    {/await}
  </GridCell>
{/if}
<GridCell class="title">
  <div role="none" class="label">
    <TruncatedText lines={2}>
      {#key appLocale.current}
        {@html getEntrySummary(collection, entry, { useTemplate: true, allowMarkdown: true })}
      {/key}
      {#if isCollectionIndexFile(collection, entry)}
        <Icon name={getIndexFile(collection)?.icon} class="home" />
      {/if}
    </TruncatedText>
  </div>
</GridCell>
<GridCell class="pinned">
  {#if isPinned}
    <span class="pinned-badge">置顶</span>
  {/if}
</GridCell>

<style>
  .label {
    :global {
      .icon.home {
        opacity: 0.5;
        font-size: 20px;
        vertical-align: -4px;
      }
    }
  }

  .image :global(.default-thumb) {
    display: flex;
    align-items: center;
    justify-content: center;
    width: 100%;
    height: 100%;
    color: var(--sui-secondary-foreground-color, #999);
    font-size: 22px;
  }

  .pinned {
    text-align: right;
    padding-right: 12px;
  }

  .pinned-badge {
    display: inline-block;
    background: #fff2e8;
    color: #d4380d;
    border: 1px solid #ffbb96;
    border-radius: 3px;
    padding: 2px 8px;
    font-size: 12px;
    font-weight: 500;
    white-space: nowrap;
  }
</style>
