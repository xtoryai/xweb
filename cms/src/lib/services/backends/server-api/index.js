import { get } from 'svelte/store';

import { createFileList } from '$lib/services/backends/process';
import { cmsConfig } from '$lib/services/config';
import { allAssets } from '$lib/services/assets';
import {
  allEntries,
  collectionPagination,
  dataLoaded,
  dataLoadedProgress,
  entryParseErrors,
} from '$lib/services/contents';
import { prepareEntries } from '$lib/services/contents/file/process';
import { gitConfigFiles } from '$lib/services/backends/git/shared/config';

/**
 * @import {
 *   BackendService,
 *   CommitResults,
 *   FileChange,
 *   RepositoryInfo,
 *   SignInOptions,
 *   User,
 * } from '$lib/types/private';
 */

const BACKEND_NAME = 'server-api';
const BACKEND_LABEL = 'Server API';

let apiBase = '';
let jwtToken = '';

/**
 * Get the base URL for API calls (the site origin).
 * @returns {string} API base URL.
 */
function getApiBase() {
  if (apiBase) return apiBase;
  apiBase = window.location.origin;
  return apiBase;
}

/**
 * Make an authenticated API request.
 * @param {string} path API path, e.g. '/api/cms/files?list=true'.
 * @param {object} [options] Fetch options.
 * @returns {Promise<Response>} Fetch response.
 */
async function apiFetch(path, options = {}) {
  const headers = {
    ...(options.headers || {}),
  };

  if (jwtToken) {
    headers['Authorization'] = `Bearer ${jwtToken}`;
  }

  if (!headers['Content-Type'] && options.body) {
    headers['Content-Type'] = 'application/json';
  }

  return fetch(`${getApiBase()}${path}`, { ...options, headers });
}

/**
 * Initialize the server-api backend.
 * @returns {RepositoryInfo | undefined}
 */
const init = () => {
  const { backend } = get(cmsConfig) ?? {};

  if (backend?.name !== BACKEND_NAME) {
    return undefined;
  }

  return {
    service: BACKEND_NAME,
    label: BACKEND_LABEL,
    owner: '',
    repo: '',
    branch: '',
  };
};

/**
 * Sign in with username/password via server API.
 * The token parameter holds the JWT obtained by the sign-in component after authentication.
 * @param {SignInOptions} options Options.
 * @returns {Promise<User | void>} User info.
 * @throws {Error} When authentication fails.
 */
const signIn = async ({ token, auto = false }) => {
  if (auto && !token) {
    return undefined;
  }

  if (!token) {
    throw new Error('No token provided');
  }

  // Store token and verify it works
  jwtToken = token;

  // Verify the token by making a test request
  const response = await apiFetch('/api/cms/files?list=true');

  if (!response.ok) {
    jwtToken = '';
    if (response.status === 401) {
      throw new Error('Invalid credentials', {
        cause: { message: '用户名或密码错误，请重试' },
      });
    }
    throw new Error(`Server error: ${response.status}`);
  }

  // Decode JWT payload (base64url) to extract the actual username
  let username = 'admin';
  try {
    const payload = token.split('.')[0];
    // Convert base64url to standard base64 for atob()
    const base64 = payload.replace(/-/g, '+').replace(/_/g, '/');
    const decoded = JSON.parse(atob(base64));
    username = decoded.username || 'admin';
  } catch {
    // Fallback to 'admin' if token cannot be decoded
  }

  return {
    backendName: BACKEND_NAME,
    token,
    name: username,
    login: username,
  };
};

/**
 * Sign out from the server API.
 */
const signOut = async () => {
  jwtToken = '';
  apiBase = '';
};

/**
 * Fetch all files from the server and populate the content stores.
 */
const fetchFiles = async () => {
  dataLoadedProgress.set(0);

  const response = await apiFetch('/api/cms/files?list=true');

  if (!response.ok) {
    throw new Error(`Failed to fetch files: ${response.status}`);
  }

  const { files } = await response.json();

  /** @type {import('$lib/types/private').BaseFileListItemProps[]} */
  const fileItems = files.map((f) => ({
    path: f.path,
    sha: f.sha || '',
    size: f.size || 0,
    name: f.name,
    text: f.text,
  }));

  dataLoadedProgress.set(50);

  // Use the same processing pipeline as the local backend
  const { entryFiles, assetFiles, configFiles } = createFileList(fileItems);

  /** @type {import('$lib/types/private').BaseEntryListItem[]} */
  const entryFileItems = entryFiles;

  // Prepare entries from text files
  const { entries, errors } = await prepareEntries(entryFileItems);

  /** @type {import('$lib/types/private').Asset[]} */
  const assets = assetFiles.map((fileInfo) => {
    const { name, path, sha, size } = fileInfo;
    const ext = (name.split('.').pop() || '').toLowerCase();
    let kind = /** @type {import('$lib/types/private').AssetKind} */ ('other');
    if (/^(png|jpe?g|gif|webp|svg|avif|ico)$/i.test(ext)) kind = 'image';
    else if (/^(mp4|webm|ogg|mov|avi)$/i.test(ext)) kind = 'video';
    else if (/^(mp3|wav|ogg|flac)$/i.test(ext)) kind = 'audio';
    else if (/^(pdf|doc|docx|xls|xlsx|ppt|pptx)$/i.test(ext)) kind = 'document';

    return { ...fileInfo, kind, size, sha };
  });

  allEntries.set(entries);
  allAssets.set(assets);
  gitConfigFiles.set(configFiles);
  entryParseErrors.set(errors);
  dataLoadedProgress.set(100);
  dataLoaded.set(true);
};

/**
 * Fetch a binary asset as a Blob from the server.
 * @param {import('$lib/types/private').Asset} asset Asset to fetch.
 * @returns {Promise<Blob>} Blob of the asset.
 */
const fetchBlob = async (asset) => {
  const response = await apiFetch(`/api/cms/files?media=${encodeURIComponent(asset.path)}`);

  if (!response.ok) {
    throw new Error(`Failed to fetch asset: ${response.status}`);
  }

  return response.blob();
};

/**
 * Upload a single image immediately for processing, return the server-processed path.
 * @param {File} file File to upload.
 * @param {string} targetPath Where the file should live (used to determine upload dir).
 * @returns {Promise<string>} The processed path on the server.
 */
const uploadAndProcessImage = async (file, targetPath) => {
  const formData = new FormData();
  formData.append('file', file);
  formData.append('path', targetPath);
  const resp = await fetch(`${getApiBase()}/api/cms/upload`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${jwtToken}` },
    body: formData,
  });
  if (!resp.ok) throw new Error(`Upload failed: ${resp.status}`);
  const data = await resp.json();
  return data.path;
};

/**
 * Commit file changes to the server.
 * Images with File data are pre-uploaded for immediate processing.
 * Text content is updated with renamed image paths so references stay correct.
 */
const commitChanges = async (changes) => {
  // Step 1: Upload any image files immediately, collect old→new path mappings
  /** @type {Map<string, string>} */
  const pathMap = new Map(); // oldPath → newPath

  const resolvedChanges = await Promise.all(
    changes.map(async (change) => {
      const isImageUpload = (change.action === 'create' || change.action === 'update')
        && change.data instanceof File
        && /\.(png|jpe?g|gif|webp|avif|svg)$/i.test(change.path);

      // Already in a date folder? skip
      const parentDir = change.path.split('/').slice(-2, -1)[0];
      const alreadyProcessed = /^\d{8}$/.test(parentDir);

      if (isImageUpload && !alreadyProcessed) {
        try {
          const newPath = await uploadAndProcessImage(change.data, change.path);
          pathMap.set(change.path, newPath);
          // Commit with OLD path, no data — upload already saved at newPath.
          // Server will find the file via date-folder search and return old path → SHA.
          return { action: change.action, path: change.path, previousPath: change.previousPath, previousSha: change.previousSha };
        } catch {
          // Fall through — send as raw file
        }
      }

      if (isImageUpload && alreadyProcessed) {
        return { action: change.action, path: change.path, previousPath: change.previousPath, previousSha: change.previousSha };
      }

      const serialized = {
        action: change.action,
        path: change.path,
        previousPath: change.previousPath,
        previousSha: change.previousSha,
      };

      if (change.data instanceof File) {
        const buffer = await change.data.arrayBuffer();
        const bytes = new Uint8Array(buffer);
        let binary = '';
        for (let i = 0; i < bytes.length; i++) binary += String.fromCharCode(bytes[i]);
        serialized.data = btoa(binary);
        serialized.encoding = 'base64';
      } else if (typeof change.data === 'string') {
        serialized.data = change.data;
        serialized.encoding = 'utf8';
      }

      return serialized;
    }),
  );

  const response = await apiFetch('/api/cms/commit', {
    method: 'POST',
    body: JSON.stringify({ changes: resolvedChanges }),
  });

  if (!response.ok) {
    const errData = await response.json().catch(() => ({}));
    throw new Error(errData.error || `Commit failed: ${response.status}`);
  }

  return response.json();
};

/**
 * Fetch a single page of entries for a collection.
 * On page 1 (or sort change), replaces the collection's entries in `allEntries`.
 * On subsequent pages, appends to the existing list.
 *
 * @param {object} options Options.
 * @param {string} options.collection Collection name, e.g. 'posts'.
 * @param {number} [options.page] Page number (1-based, default 1).
 * @param {number} [options.limit] Entries per page (default 50).
 * @param {string} [options.sort] Sort field (pinned / date / title).
 * @param {string} [options.order] Sort order (asc / desc).
 * @returns {Promise<{ entries: import('$lib/types/private').Entry[], pagination: object }>}
 */
const fetchCollectionPage = async ({ collection, page = 1, limit, sort, order }) => {
  // Set loading flag
  collectionPagination.update((state) => ({
    ...state,
    [collection]: { ...(state[collection] || {}), loading: true },
  }));

  try {
    let url = `/api/cms/files?list=true&collection=${collection}&page=${page}`;
    if (limit) url += `&limit=${limit}`;
    if (sort) url += `&sort=${sort}&order=${order || 'desc'}`;

    const response = await apiFetch(url);

    if (!response.ok) {
      throw new Error(`Failed to fetch page: ${response.status}`);
    }

    const data = await response.json();

    if (!data.entries) {
      throw new Error('Unexpected response: no entries array');
    }

    // Map raw files to the format expected by the processing pipeline
    /** @type {import('$lib/types/private').BaseFileListItemProps[]} */
    const fileItems = data.entries.map((f) => ({
      path: f.path,
      sha: f.sha || '',
      size: f.size || 0,
      name: f.name,
      text: f.text,
    }));

    const { entryFiles } = createFileList(fileItems);
    const entryFileItems = /** @type {import('$lib/types/private').BaseEntryListItem[]} */ (entryFiles);
    const { entries, errors } = await prepareEntries(entryFileItems);

    // Update allEntries: replace on page 1, append on subsequent pages
    if (page <= 1) {
      // Remove existing entries for this collection
      const existing = get(allEntries);
      const { getAssociatedCollections } = await import('$lib/services/contents/entry');
      const kept = existing.filter((entry) => {
        const colls = getAssociatedCollections(entry);
        return !colls.some((c) => c.name === collection);
      });
      allEntries.set([...kept, ...entries]);
    } else {
      allEntries.update((existing) => [...existing, ...entries]);
    }

    // Merge parse errors
    if (errors.length) {
      entryParseErrors.update((existing) => [...existing, ...errors]);
    }

    // Update pagination state
    const { pagination } = data;
    collectionPagination.update((state) => ({
      ...state,
      [collection]: {
        page: pagination.page,
        totalPages: pagination.totalPages,
        total: pagination.total,
        hasMore: pagination.page < pagination.totalPages,
        loading: false,
      },
    }));

    return { entries, pagination };
  } catch (e) {
    collectionPagination.update((state) => ({
      ...state,
      [collection]: { ...(state[collection] || {}), loading: false },
    }));
    throw e;
  }
};

/**
 * Remove all entries for a specific collection from `allEntries`.
 * Used before a sort change or when reloading page 1.
 * @param {string} collectionName Collection name.
 */
const resetCollection = async (collectionName) => {
  const { getAssociatedCollections } = await import('$lib/services/contents/entry');

  allEntries.update((existing) =>
    existing.filter((entry) => {
      const colls = getAssociatedCollections(entry);
      return !colls.some((c) => c.name === collectionName);
    }),
  );

  // Reset pagination state for this collection
  collectionPagination.update((state) => {
    const next = { ...state };
    delete next[collectionName];
    return next;
  });
};

/**
 * @type {BackendService}
 */
export default {
  isGit: false,
  name: BACKEND_NAME,
  label: BACKEND_LABEL,
  init,
  signIn,
  signOut,
  fetchFiles,
  fetchBlob,
  commitChanges,
  fetchCollectionPage,
  resetCollection,
};
