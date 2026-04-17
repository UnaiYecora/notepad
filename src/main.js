import './style.scss';
import { marked } from 'marked';
import { registerSW } from 'virtual:pwa-register';

registerSW({
	onNeedRefresh() {
		if (confirm('New version available. Reload?')) {
			updateSW(true);
		}
	},
	onUpdated() {
		window.location.reload();
	},
	onOfflineReady() {
		console.log('App ready to work offline');
	}
});

// --- DOM Elements ---
const appWrapper     = document.getElementById('appWrapper');
const appMain        = document.getElementById('appMain');
const notepad        = document.getElementById('notepad');
const charCount      = document.getElementById('charCount');
const wordCount      = document.getElementById('wordCount');
const toast          = document.getElementById('toast');
const notepadPreview = document.getElementById('notepadPreview');

// Buttons
const btnSettings    = document.getElementById('btnSettings');
const btnSnapshots   = document.getElementById('btnSnapshots');
const btnFullscreen  = document.getElementById('btnFullscreen');
const btnPreview     = document.getElementById('btnPreview');
const btnInstall     = document.getElementById('btnInstall');
const btnFloating    = document.getElementById('btnFloating');
if (!('documentPictureInPicture' in window)) {
    btnFloating.style.display = 'none';
}

// Modals & Settings inputs
const modalSettings         = document.getElementById('modalSettings');
const btnCloseSettings      = document.getElementById('btnCloseSettings');
const settingTheme          = document.getElementById('settingTheme');
const settingFont           = document.getElementById('settingFont');
const settingFontSize       = document.getElementById('settingFontSize');
const settingLineHeight     = document.getElementById('settingLineHeight');
const settingWidth          = document.getElementById('settingWidth');
const settingSpellcheck     = document.getElementById('settingSpellcheck');
const settingBgDots         = document.getElementById('settingBgDots');
const settingMargins        = document.getElementById('settingMargins');
const settingwideScrollArea = document.getElementById('settingwideScrollArea');

const modalSnapshots         = document.getElementById('modalSnapshots');
const btnCloseSnapshots      = document.getElementById('btnCloseSnapshots');
const btnSaveCurrentSnapshot = document.getElementById('btnSaveCurrentSnapshot');
const snapshotList           = document.getElementById('snapshotList');

// --- State Management ---
let currentText = localStorage.getItem('notepad_text') || '';
let snapshots = JSON.parse(localStorage.getItem('notepad_snapshots')) || [];
let settings = JSON.parse(localStorage.getItem('notepad_settings')) || {
	theme         : 'dark',
	font          : "'Roboto Mono', monospace",
	fontSize      : '28',
	lineHeight    : '1.5',
	width         : '100',
	spellcheck    : true,
	bgDots        : true,
	margins       : false,
	wideScrollArea: false,
};

// --- Initialization ---
function init() {
	notepad.value = currentText;
	applySettings();
	updateCounts();

	// Apply loaded settings to form inputs
	settingTheme.value            = settings.theme;
	settingFont.value             = settings.font;
	settingFontSize.value         = settings.fontSize;
	settingLineHeight.value       = settings.lineHeight;
	settingWidth.value            = settings.width;
	settingSpellcheck.checked     = settings.spellcheck;
	settingBgDots.checked         = settings.bgDots;
	settingMargins.checked        = settings.margins;
	settingwideScrollArea.checked = settings.wideScrollArea;

	// UI
	setTimeout(() => {
		updateNotepadHeight();
	}, 50);
}

// --- Resize notepad ---
notepad.addEventListener('input', updateNotepadHeight);
window.addEventListener("resize", updateNotepadHeight)
function updateNotepadHeight() {
	if (settings.wideScrollArea) {
		const scrollY = window.scrollY;
	
		notepad.style.height = 'auto';
		notepad.style.height = notepad.scrollHeight + 'px';
	
		window.scrollTo(0, scrollY);
	} else {
		notepad.style.height = 'unset';
	}
}

// --- Auto-hide UI ---
notepad.addEventListener('input', hideUI);
notepad.addEventListener('focus', hideUI);
document.addEventListener('scroll', hideUI)
let hideUiTimeout;
function hideUI() {
	appWrapper.classList.add('active');

	clearTimeout(hideUiTimeout);
	hideUiTimeout = setTimeout(() => {
		appWrapper.classList.remove('active');
	}, 1000);
}

// --- Auto-save & Counts ---
notepad.addEventListener('input', () => {
	currentText = notepad.value;
	localStorage.setItem('notepad_text', currentText);
	updateCounts();
});

function updateCounts() {
	const text = notepad.value;
	charCount.textContent = `${text.length} characters`;
	const words = text.trim().split(/\s+/).filter(w => w.length > 0);
	wordCount.textContent = `${words.length} words`;
}

// --- Settings Logic ---
btnSettings.addEventListener('click', () => modalSettings.showModal());
btnCloseSettings.addEventListener('click', () => modalSettings.close());

function saveAndApplySettings() {
	settings = {
		theme         : settingTheme.value,
		font          : settingFont.value,
		fontSize      : settingFontSize.value,
		lineHeight    : settingLineHeight.value,
		width         : settingWidth.value,
		spellcheck    : settingSpellcheck.checked,
		bgDots        : settingBgDots.checked,
		wideScrollArea: settingwideScrollArea.checked,
		margins       : settingMargins.checked,
	};
	localStorage.setItem('notepad_settings', JSON.stringify(settings));
	applySettings();
}

function applySettings() {
	// Apply structural and text styles
	appMain.style.fontFamily   = settings.font;
	appMain.style.fontSize     = `${settings.fontSize}px`;
	appMain.style.lineHeight   = settings.lineHeight;
	notepad.style.width        = `${settings.width}%`;
	notepad.spellcheck         = settings.spellcheck;
	notepad.style.borderInline = settings.margins ? '2px solid var(--dot)' : 'none';

	updateNotepadHeight();

	// Apply theme attribute to main document
	document.body.setAttribute('data-theme', settings.theme);
	document.body.setAttribute('data-bg-dots', settings.bgDots);
	
	// Apply theme attribute to floating window if it's currently open
	if (window.documentPictureInPicture && window.documentPictureInPicture.window) {
		window.documentPictureInPicture.window.document.body.setAttribute('data-theme', settings.theme);
		window.documentPictureInPicture.window.document.body.setAttribute('data-bg-dots', settings.bgDots);
	}
}

// Listen to all setting changes
[settingTheme, settingFont, settingFontSize, settingLineHeight, settingWidth, settingSpellcheck, settingBgDots, settingwideScrollArea, settingMargins].forEach(input => {
	input.addEventListener('change', saveAndApplySettings);
});

// --- Tab Indentation ---
notepad.addEventListener('keydown', function (e) {
	if (e.key === 'Tab') {
		e.preventDefault();
		const start = this.selectionStart;
		const end = this.selectionEnd;
		this.value = this.value.substring(0, start) + "\t" + this.value.substring(end);
		this.selectionStart = this.selectionEnd = start + 1;

		// Trigger input to auto-save and update counts
		this.dispatchEvent(new Event('input'));
	}
});

// --- Snapshots Logic ---
btnSnapshots.addEventListener('click', () => {
	renderSnapshots();
	modalSnapshots.showModal();
});
btnCloseSnapshots.addEventListener('click', () => modalSnapshots.close());
btnSaveCurrentSnapshot.addEventListener('click', () => saveSnapshot());

function saveSnapshot() {
	if (!notepad.value.trim()) return; // Don't save empty snapshots

	const snapshot = {
		id: Date.now(),
		date: new Date().toLocaleString(),
		text: notepad.value,
		snippet: notepad.value.substring(0, 120) + '...'
	};

	snapshots.unshift(snapshot);
	localStorage.setItem('notepad_snapshots', JSON.stringify(snapshots));
	renderSnapshots();
	showToast('Note saved');
}

function renderSnapshots() {
	snapshotList.innerHTML = '';
	snapshots.forEach(snap => {
		const li = document.createElement('li');
		li.className = 'snapshot-item';
		li.innerHTML = /*html*/`
		<div class="snapshot-info">
			<p class="snapshot-snippet">${snap.snippet}</p>
			<div class="snapshot-bottom-bar">
				<p class="snapshot-date">${snap.date}</p>
				<button class="btn-restore" data-id="${snap.id}">Restore</button>
				<button class="btn-delete" data-id="${snap.id}">Delete</button>
			</div>
		</div>
    `;
		snapshotList.appendChild(li);
	});

	// Attach event listeners to dynamically created buttons
	document.querySelectorAll('.btn-restore').forEach(btn => {
		btn.addEventListener('click', (e) => {
			const id = e.target.getAttribute('data-id');
			const snap = snapshots.find(s => s.id == id);
			if (notepad.value.length > 0 && confirm("Save current content before replacing it?") === true) {
				saveSnapshot()
			}
			if (snap) {
				notepad.value = snap.text;
				notepad.dispatchEvent(new Event('input')); // trigger autosave
				modalSnapshots.close();
				showToast("Note restored");
			}
		});
	});

	document.querySelectorAll('.btn-delete').forEach(btn => {
		btn.addEventListener('click', (e) => {
			if (confirm("Are you sure you want to permanently delete this?") === true) {
				const id = e.target.getAttribute('data-id');
				snapshots = snapshots.filter(s => s.id != id);
				localStorage.setItem('notepad_snapshots', JSON.stringify(snapshots));
				renderSnapshots();
				showToast("Note deleted")
			}
		});
	});
}

// CTRL+S Shortcut
document.addEventListener('keydown', (e) => {
	if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 's') {
		e.preventDefault();
		saveSnapshot();
	}
});

// Toast notifications
let toastTimeout;
function showToast(message) {
    if (!message) return;
    toast.textContent = message;
    toast.classList.remove('hidden');
    toast.style.display = 'block';
    clearTimeout(toastTimeout);
    toastTimeout = setTimeout(() => {
        toast.classList.add('hidden');
        toast.style.display = 'none';
    }, 2000);
}

// --- Fullscreen Logic ---
btnFullscreen.addEventListener('click', () => {
	if (!document.fullscreenElement) {
		document.documentElement.requestFullscreen().catch(err => console.error(err));
	} else {
		document.exitFullscreen();
	}
});

// --- Floating Window (Document Picture-in-Picture API) ---
btnFloating.addEventListener('click', async () => {
	if (!('documentPictureInPicture' in window)) {
		alert('Document Picture-in-Picture API is not supported in this browser.');
		return;
	}

	try {
		const pipWindow = await window.documentPictureInPicture.requestWindow({
			width : 600,
			height: 500
		});

		// Copy over stylesheets to retain classes for styling
		[...document.styleSheets].forEach(styleSheet => {
			try {
				if (styleSheet.ownerNode) {
					pipWindow.document.head.appendChild(styleSheet.ownerNode.cloneNode(true));
				} else if (styleSheet.href) {
					const link = document.createElement('link');
					link.rel = 'stylesheet';
					link.href = styleSheet.href;
					pipWindow.document.head.appendChild(link);
				}
			} catch (e) {
				console.warn('Could not copy stylesheet to PiP window', e);
			}
		});

		// Add custom classes and theme to the PiP window's body
		pipWindow.document.body.classList.add('app-body', 'is-floating-window');
		pipWindow.document.body.setAttribute('data-theme', settings.theme);
		
		// Move the entire wrapper to the PiP window
		pipWindow.document.body.appendChild(appWrapper);

		// Listen for when the PiP window closes to bring the app wrapper back
		pipWindow.addEventListener('pagehide', () => {
			document.body.appendChild(appWrapper);
		});

	} catch (error) {
		console.error('Failed to open PiP window:', error);
	}
});


// --- Install PWA Logic ---
let deferredPrompt;
window.addEventListener('beforeinstallprompt', (e) => {
	// Prevent the default mini-infobar from appearing on mobile
	// e.preventDefault();

	// Stash the event so it can be triggered later.
	deferredPrompt = e;

	// Update UI to notify the user they can install the PWA
	btnInstall.classList.remove('hidden');
});

btnInstall.addEventListener('click', async () => {
	if (!deferredPrompt) return;

	// Show the install prompt
	deferredPrompt.prompt();
	// Wait for the user to respond to the prompt
	const { outcome } = await deferredPrompt.userChoice;
	if (outcome === 'accepted') {
		console.log('User accepted the install prompt');
	}
	// We've used the prompt, and can't use it again, throw it away
	deferredPrompt = null;
	// Hide the button
	btnInstall.classList.add('hidden');
});

// If the app is installed (either via our button or the browser menu), hide the button
window.addEventListener('appinstalled', () => {
	btnInstall.classList.add('hidden');
	deferredPrompt = null;
});


// --- Import / Export Logic ---

const BACKUP_SIGNATURE = 'notepad_backup_v1';

/** Snapshot the current note (if non-empty) and return the full backup object */
function buildBackup() {
    // Save current note as a snapshot first
    if (notepad.value.trim()) {
        saveSnapshot();
    }
    return {
        __type   : BACKUP_SIGNATURE,
        exportedAt: new Date().toISOString(),
        snapshots : snapshots,
    };
}

/** Validate that a parsed object looks like a backup from this app */
function isValidBackup(data) {
    return (
        data &&
        typeof data === 'object' &&
        data.__type === BACKUP_SIGNATURE &&
        Array.isArray(data.snapshots) &&
        data.snapshots.every(s =>
            typeof s.id      === 'number' &&
            typeof s.date    === 'string' &&
            typeof s.text    === 'string' &&
            typeof s.snippet === 'string'
        )
    );
}

/** Merge imported snapshots (de-dupe by id, newest first) */
function mergeImport(data) {
    const existingIds = new Set(snapshots.map(s => s.id));
    const newOnes = data.snapshots.filter(s => !existingIds.has(s.id));
    snapshots = [...newOnes, ...snapshots];
    localStorage.setItem('notepad_snapshots', JSON.stringify(snapshots));
    showToast('Imported ' + newOnes.length + ' note(s)');
    renderSnapshots();
}

// Export → Clipboard
document.getElementById('btnExportClipboard').addEventListener('click', async () => {
    const backup = buildBackup();
    try {
        await navigator.clipboard.writeText(JSON.stringify(backup, null, 2));
        showToast('Copied to clipboard');
    } catch (err) {
        alert('Could not access clipboard: ' + err.message);
    }
});

// Export → File
document.getElementById('btnExportFile').addEventListener('click', () => {
    const backup = buildBackup();
    const blob = new Blob([JSON.stringify(backup, null, 2)], { type: 'application/json' });
    const url  = URL.createObjectURL(blob);
    const a    = document.createElement('a');
    a.href     = url;
    a.download = `notepad-backup-${new Date().toISOString().slice(0, 10)}.json`;
    a.click();
    URL.revokeObjectURL(url);
    showToast('File downloaded');
});

// Import → Clipboard
document.getElementById('btnImportClipboard').addEventListener('click', () => {
    const text = prompt('Paste your backup JSON:')?.trim();
    if (!text) return;
    try {
        const data = JSON.parse(text);
        if (!isValidBackup(data)) throw new Error('Not a valid notepad backup.');
        mergeImport(data);
    } catch (err) {
        alert('Import failed: ' + (err instanceof SyntaxError ? 'Content is not valid JSON.' : err.message));
    }
});

// Import → File (trigger hidden input)
const importFileInput = document.getElementById('importFileInput');
document.getElementById('btnImportFile').addEventListener('click', () => importFileInput.click());

importFileInput.addEventListener('change', (e) => {
    const file = e.target.files[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (ev) => {
        try {
            const data = JSON.parse(ev.target.result);
            if (!isValidBackup(data)) throw new Error('Not a valid notepad backup.');
            mergeImport(data);
        } catch (err) {
            alert('Import failed: ' + err.message);
        }
        // Reset so the same file can be re-imported if needed
        importFileInput.value = '';
    };
    reader.readAsText(file);
});


// --- Markdown preview ---
let previewMode = false;

function updatePreview() {
    notepadPreview.innerHTML = marked.parse(
        notepad.value.replace(/^[\u200B\u200C\u200D\u200E\u200F\uFEFF]/, "")
    );
}

btnPreview.addEventListener('click', () => {
	previewMode = !previewMode;
	notepadPreview.classList.toggle("md-on");
	notepad.style.display = previewMode ? 'none' : '';
	notepadPreview.style.display = previewMode ? 'block' : 'none';
	btnPreview.classList.toggle('active', previewMode);
	if (previewMode) updatePreview();
	updateNotepadHeight();
});


// --------------------------- Run Init ---------------------------------
init();