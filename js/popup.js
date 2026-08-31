/**
 * KOLAB LMS - Universal Popup & Toast System
 * Replaces native browser alert() and confirm() with modern DaisyUI / Tailwind modal popups.
 */

(function () {
    // Ensure Toast Container exists
    function getOrCreateToastContainer() {
        let container = document.getElementById('appToastContainer');
        if (!container) {
            container = document.createElement('div');
            container.id = 'appToastContainer';
            container.className = 'fixed top-4 right-4 z-[99999] flex flex-col gap-2.5 max-w-sm w-[92vw] sm:w-80 pointer-events-none';
            document.body.appendChild(container);
        }
        return container;
    }

    /**
     * Show modern floating toast popup
     * @param {string} message - Message text or HTML
     * @param {'success'|'warning'|'error'|'info'} type - Toast type
     * @param {number} duration - Auto close duration in ms
     */
    window.showToast = function (message, type = 'success', duration = 3500) {
        const container = getOrCreateToastContainer();
        const toast = document.createElement('div');
        toast.className = 'pointer-events-auto shadow-2xl rounded-2xl p-3.5 sm:p-4 flex items-start gap-3 bg-white/95 dark:bg-slate-900/95 backdrop-blur-xl border transition-all text-xs font-semibold toast-popup-animate text-slate-800 dark:text-slate-100';

        let iconHtml = '';
        if (type === 'success') {
            toast.classList.add('border-green-500/30', 'shadow-green-500/10');
            iconHtml = '<div class="w-7 h-7 rounded-xl bg-green-500/15 text-green-500 flex items-center justify-center text-sm flex-shrink-0 mt-0.5"><i class="fa-solid fa-circle-check"></i></div>';
        } else if (type === 'warning') {
            toast.classList.add('border-amber-500/30', 'shadow-amber-500/10');
            iconHtml = '<div class="w-7 h-7 rounded-xl bg-amber-500/15 text-amber-500 flex items-center justify-center text-sm flex-shrink-0 mt-0.5"><i class="fa-solid fa-triangle-exclamation"></i></div>';
        } else if (type === 'error') {
            toast.classList.add('border-red-500/30', 'shadow-red-500/10');
            iconHtml = '<div class="w-7 h-7 rounded-xl bg-red-500/15 text-red-500 flex items-center justify-center text-sm flex-shrink-0 mt-0.5"><i class="fa-solid fa-circle-xmark"></i></div>';
        } else {
            toast.classList.add('border-syarat/30', 'shadow-syarat/10');
            iconHtml = '<div class="w-7 h-7 rounded-xl bg-syarat/15 text-syarat dark:text-syarat-light flex items-center justify-center text-sm flex-shrink-0 mt-0.5"><i class="fa-solid fa-circle-info"></i></div>';
        }

        toast.innerHTML = `
            ${iconHtml}
            <div class="flex-1 leading-snug break-words">
                ${message}
            </div>
            <button class="text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 p-1 -mr-1 -mt-1 rounded-lg transition-colors flex-shrink-0" aria-label="Tutup">
                <i class="fa-solid fa-xmark text-xs"></i>
            </button>
        `;

        const closeBtn = toast.querySelector('button');
        const removeToast = () => {
            toast.classList.add('hide');
            setTimeout(() => {
                if (toast.parentNode) toast.parentNode.removeChild(toast);
            }, 250);
        };

        closeBtn.onclick = removeToast;
        container.appendChild(toast);

        if (duration > 0) {
            setTimeout(removeToast, duration);
        }
    };

    /**
     * Show confirmation modal popup
     * @param {Object} options
     * @param {string} options.title - Modal title
     * @param {string} options.message - Modal description text
     * @param {'danger'|'warning'|'primary'} [options.type='danger']
     * @param {string} [options.confirmText='Ya, Lanjutkan']
     * @param {string} [options.cancelText='Batal']
     * @param {Function} options.onConfirm - Callback when confirmed
     * @param {Function} [options.onCancel] - Callback when cancelled
     */
    window.showConfirmModal = function ({
        title = 'Konfirmasi Tindakan',
        message = 'Apakah Anda yakin ingin melanjutkan?',
        type = 'danger',
        confirmText = 'Ya, Lanjutkan',
        cancelText = 'Batal',
        onConfirm,
        onCancel
    }) {
        let modal = document.getElementById('appConfirmModal');
        if (!modal) {
            modal = document.createElement('dialog');
            modal.id = 'appConfirmModal';
            modal.className = 'modal modal-bottom sm:modal-middle';
            document.body.appendChild(modal);
        }

        let iconBg = 'bg-red-500/15 text-red-500';
        let iconClass = 'fa-solid fa-triangle-exclamation';
        let confirmBtnClass = 'bg-red-500 hover:bg-red-600 text-white';

        if (type === 'warning') {
            iconBg = 'bg-amber-500/15 text-amber-500';
            iconClass = 'fa-solid fa-triangle-exclamation';
            confirmBtnClass = 'bg-amber-500 hover:bg-amber-600 text-white';
        } else if (type === 'primary') {
            iconBg = 'bg-syarat/15 text-syarat dark:text-syarat-light';
            iconClass = 'fa-solid fa-circle-question';
            confirmBtnClass = 'btn-duotone text-white';
        }

        modal.innerHTML = `
            <div class="modal-box glass-card p-6 rounded-3xl max-w-md w-full space-y-4">
                <div class="flex items-center gap-3 border-b border-slate-200 dark:border-slate-800 pb-3">
                    <div class="w-10 h-10 rounded-2xl ${iconBg} flex items-center justify-center text-lg flex-shrink-0">
                        <i class="${iconClass}"></i>
                    </div>
                    <div class="space-y-0.5">
                        <h3 class="font-extrabold text-sm sm:text-base text-slate-800 dark:text-slate-100">${title}</h3>
                        <span class="text-[10px] text-slate-400 font-semibold uppercase tracking-wider">Konfirmasi Sistem</span>
                    </div>
                </div>

                <p class="text-xs text-slate-600 dark:text-slate-300 leading-relaxed font-medium">
                    ${message}
                </p>

                <div class="modal-action pt-2 flex justify-end gap-2">
                    <button type="button" id="appConfirmCancelBtn" class="px-4 py-2.5 rounded-xl text-xs font-bold border border-slate-300 dark:border-slate-700 hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-600 dark:text-slate-300 transition-all">
                        ${cancelText}
                    </button>
                    <button type="button" id="appConfirmActionBtn" class="px-5 py-2.5 rounded-xl text-xs font-bold shadow-md transition-all ${confirmBtnClass}">
                        ${confirmText}
                    </button>
                </div>
            </div>
            <form method="dialog" class="modal-backdrop">
                <button>close</button>
            </form>
        `;

        modal.querySelector('#appConfirmCancelBtn').onclick = () => {
            modal.close();
            if (onCancel) onCancel();
        };

        modal.querySelector('#appConfirmActionBtn').onclick = () => {
            modal.close();
            if (onConfirm) onConfirm();
        };

        modal.showModal();
    };

    /**
     * Show information popup modal
     * @param {Object} options
     */
    window.showInfoModal = function ({
        title = 'Informasi',
        message = '',
        type = 'info',
        buttonText = 'Tutup'
    }) {
        let modal = document.getElementById('appInfoModal');
        if (!modal) {
            modal = document.createElement('dialog');
            modal.id = 'appInfoModal';
            modal.className = 'modal modal-bottom sm:modal-middle';
            document.body.appendChild(modal);
        }

        let iconBg = 'bg-syarat/15 text-syarat dark:text-syarat-light';
        let iconClass = 'fa-solid fa-circle-info';

        if (type === 'success') {
            iconBg = 'bg-green-500/15 text-green-500';
            iconClass = 'fa-solid fa-circle-check';
        } else if (type === 'warning') {
            iconBg = 'bg-amber-500/15 text-amber-500';
            iconClass = 'fa-solid fa-triangle-exclamation';
        }

        modal.innerHTML = `
            <div class="modal-box glass-card p-6 rounded-3xl max-w-md w-full space-y-4">
                <div class="flex items-center gap-3 border-b border-slate-200 dark:border-slate-800 pb-3">
                    <div class="w-10 h-10 rounded-2xl ${iconBg} flex items-center justify-center text-lg flex-shrink-0">
                        <i class="${iconClass}"></i>
                    </div>
                    <div class="space-y-0.5">
                        <h3 class="font-extrabold text-sm sm:text-base text-slate-800 dark:text-slate-100">${title}</h3>
                        <span class="text-[10px] text-slate-400 font-semibold uppercase tracking-wider">Pemberitahuan Sistem</span>
                    </div>
                </div>

                <div class="text-xs text-slate-600 dark:text-slate-300 leading-relaxed font-medium">
                    ${message}
                </div>

                <div class="modal-action pt-2">
                    <button type="button" onclick="document.getElementById('appInfoModal').close()" class="btn-duotone px-5 py-2.5 rounded-xl text-xs font-bold shadow-md">
                        ${buttonText}
                    </button>
                </div>
            </div>
            <form method="dialog" class="modal-backdrop">
                <button>close</button>
            </form>
        `;

        modal.showModal();
    };

    // Safely override window.alert with smooth toast
    window.alert = function (msg) {
        window.showToast(msg, 'info');
    };
})();
