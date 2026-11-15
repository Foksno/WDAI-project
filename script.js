/* =========================================================
   Portfolio — skrypty wspólne dla wszystkich podstron
   ========================================================= */

const THEME_KEY = "portfolio-theme";
const FILTER_KEY = "portfolio-filter";
const DRAFT_KEY = "portfolio-contact-draft";

/* Bezpieczny dostęp do localStorage (np. tryb prywatny może rzucać wyjątek) */
const storage = {
    get(key) {
        try { return localStorage.getItem(key); } catch { return null; }
    },
    set(key, value) {
        try { localStorage.setItem(key, value); } catch { /* ignorujemy */ }
    },
    remove(key) {
        try { localStorage.removeItem(key); } catch { /* ignorujemy */ }
    }
};

/* ===== 1. Przełącznik motywu (zapis w localStorage) ===== */
function initThemeToggle() {
    const button = document.querySelector(".theme-toggle");
    if (!button) return;

    const update = () => {
        const isDark = document.documentElement.dataset.theme === "dark";
        button.textContent = isDark ? "☀️" : "🌙";
        button.setAttribute("aria-label", isDark ? "Włącz jasny motyw" : "Włącz ciemny motyw");
        button.setAttribute("aria-pressed", String(isDark));
    };

    button.addEventListener("click", () => {
        const next = document.documentElement.dataset.theme === "dark" ? "light" : "dark";
        document.documentElement.dataset.theme = next;
        storage.set(THEME_KEY, next);
        update();
    });

    update();
}

/* ===== 2. Menu mobilne (pokazywanie / ukrywanie) ===== */
function initNavToggle() {
    const toggle = document.querySelector(".nav-toggle");
    const nav = document.getElementById("main-nav");
    if (!toggle || !nav) return;

    const setOpen = (open) => {
        nav.classList.toggle("is-open", open);
        toggle.setAttribute("aria-expanded", String(open));
        toggle.textContent = open ? "✕" : "☰";
        toggle.setAttribute("aria-label", open ? "Zamknij menu" : "Otwórz menu");
    };

    toggle.addEventListener("click", () => {
        setOpen(!nav.classList.contains("is-open"));
    });

    document.addEventListener("keydown", (event) => {
        if (event.key === "Escape" && nav.classList.contains("is-open")) {
            setOpen(false);
            toggle.focus();
        }
    });
}

/* ===== 3. Filtr projektów w galerii ===== */
function initProjectFilter() {
    const buttons = document.querySelectorAll(".filter-btn");
    const cards = document.querySelectorAll(".project-card");
    const counter = document.getElementById("project-count");
    const empty = document.getElementById("gallery-empty");
    if (!buttons.length || !cards.length) return;

    const applyFilter = (filter) => {
        let visible = 0;

        cards.forEach((card) => {
            const categories = card.dataset.category.split(" ");
            const show = filter === "all" || categories.includes(filter);
            card.hidden = !show;
            if (show) visible++;
        });

        buttons.forEach((btn) => {
            btn.setAttribute("aria-pressed", String(btn.dataset.filter === filter));
        });

        if (counter) {
            counter.textContent = `Wyświetlono ${visible} z ${cards.length} projektów`;
        }
        if (empty) {
            empty.hidden = visible !== 0;
        }

        storage.set(FILTER_KEY, filter);
    };

    buttons.forEach((btn) => {
        btn.addEventListener("click", () => applyFilter(btn.dataset.filter));
    });

    const saved = storage.get(FILTER_KEY);
    const exists = [...buttons].some((btn) => btn.dataset.filter === saved);
    applyFilter(exists ? saved : "all");
}

/* ===== 4. Formularz kontaktowy — walidacja i obsługa ===== */
function initContactForm() {
    const form = document.getElementById("contact-form");
    if (!form) return;

    /* Z JS przejmujemy wyświetlanie błędów (własne komunikaty pod polami).
       Bez JS działa natywna walidacja HTML (required, type, minlength...). */
    form.noValidate = true;

    const status = document.getElementById("form-status");
    const message = form.elements.message;
    const charCount = document.getElementById("char-count");
    const fields = [...form.querySelectorAll("input, select, textarea")];

    /* Czytelne komunikaty po polsku dla poszczególnych błędów */
    const getErrorMessage = (field) => {
        const v = field.validity;
        if (v.valueMissing) {
            if (field.type === "checkbox") return "Zaznacz zgodę, aby wysłać wiadomość.";
            if (field.tagName === "SELECT") return "Wybierz temat wiadomości.";
            return "To pole jest wymagane.";
        }
        if (v.typeMismatch && field.type === "email") {
            return "Podaj poprawny adres e-mail, np. jan.kowalski@example.com.";
        }
        if (v.tooShort) {
            return `Wpisz co najmniej ${field.minLength} znaków (obecnie: ${field.value.length}).`;
        }
        if (v.tooLong) {
            return `Maksymalnie ${field.maxLength} znaków.`;
        }
        if (v.patternMismatch) {
            return field.dataset.patternMessage || "Niepoprawny format.";
        }
        return "";
    };

    const showError = (field) => {
        const errorEl = document.getElementById(`${field.id}-error`);
        const msg = field.validity.valid ? "" : getErrorMessage(field);
        if (errorEl) errorEl.textContent = msg;
        field.setAttribute("aria-invalid", String(!field.validity.valid));
    };

    const updateCounter = () => {
        if (!charCount) return;
        const len = message.value.length;
        charCount.textContent = `${len} / ${message.maxLength}`;
    };

    /* Zapis szkicu wiadomości, aby nie zginął po odświeżeniu strony */
    const saveDraft = () => {
        const draft = {
            name: form.elements.name.value,
            email: form.elements.email.value,
            topic: form.elements.topic.value,
            message: message.value
        };
        storage.set(DRAFT_KEY, JSON.stringify(draft));
    };

    const restoreDraft = () => {
        const raw = storage.get(DRAFT_KEY);
        if (!raw) return;
        try {
            const draft = JSON.parse(raw);
            ["name", "email", "topic", "message"].forEach((key) => {
                if (typeof draft[key] === "string") form.elements[key].value = draft[key];
            });
        } catch {
            storage.remove(DRAFT_KEY);
        }
    };

    restoreDraft();
    updateCounter();

    fields.forEach((field) => {
        const wrapper = field.closest(".form-field");

        field.addEventListener("blur", () => {
            wrapper?.classList.add("touched");
            showError(field);
        });

        field.addEventListener("input", () => {
            if (wrapper?.classList.contains("touched")) showError(field);
            if (field === message) updateCounter();
            if (field.type !== "checkbox") saveDraft();
        });

        field.addEventListener("change", () => {
            wrapper?.classList.add("touched");
            showError(field);
        });
    });

    form.addEventListener("submit", (event) => {
        event.preventDefault();

        fields.forEach((field) => {
            field.closest(".form-field")?.classList.add("touched");
            showError(field);
        });

        const firstInvalid = fields.find((field) => !field.validity.valid);

        if (firstInvalid) {
            status.className = "form-status form-status--error";
            status.textContent = "Formularz zawiera błędy — popraw zaznaczone pola.";
            status.hidden = false;
            firstInvalid.focus();
            return;
        }

        /* Strona jest statyczna — symulujemy wysłanie wiadomości */
        const name = form.elements.name.value.trim();
        status.className = "form-status form-status--success";
        status.textContent = `Dziękuję${name ? ", " + name : ""}! Wiadomość została przygotowana do wysłania. Odpowiem najszybciej, jak to możliwe.`;
        status.hidden = false;

        form.reset();
        clearState();
    });

    /* Wspólne czyszczenie stanu (po wysłaniu i po kliknięciu „Wyczyść”) */
    function clearState() {
        storage.remove(DRAFT_KEY);
        fields.forEach((field) => {
            field.closest(".form-field")?.classList.remove("touched");
            field.removeAttribute("aria-invalid");
            const errorEl = document.getElementById(`${field.id}-error`);
            if (errorEl) errorEl.textContent = "";
        });
        updateCounter();
    }

    form.addEventListener("reset", () => {
        status.hidden = true;
        /* reset zmienia wartości po zdarzeniu — licznik aktualizujemy w kolejnym cyklu */
        setTimeout(clearState, 0);
    });
}

/* ===== 5. Bieżący rok w stopce ===== */
function initFooterYear() {
    const year = document.getElementById("year");
    if (year) year.textContent = new Date().getFullYear();
}

document.addEventListener("DOMContentLoaded", () => {
    initThemeToggle();
    initNavToggle();
    initProjectFilter();
    initContactForm();
    initFooterYear();
});
