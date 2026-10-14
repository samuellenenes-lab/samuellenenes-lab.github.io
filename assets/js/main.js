/* ==========================================================================
   Sélecteur de langue, chargement des résultats agrégés et graphiques SVG
   (forêt des odds ratios), sans librairie.
   ========================================================================== */
(function () {
    "use strict";

    var SVGNS = "http://www.w3.org/2000/svg";

    /* ---------------- Sélecteur de langue ---------------- */
    function initSwitcher() {
        var box = document.querySelector(".lang");
        if (!box) return;
        var btn = box.querySelector(".lang-btn");
        var menu = box.querySelector(".lang-menu");
        var items = Array.prototype.slice.call(menu.querySelectorAll("[data-set-lang]"));

        function open(focusIndex) {
            menu.hidden = false;
            btn.setAttribute("aria-expanded", "true");
            var i = typeof focusIndex === "number" ? focusIndex
                : items.findIndex(function (it) { return it.getAttribute("aria-checked") === "true"; });
            (items[i] || items[0]).focus();
        }
        function close(refocus) {
            if (menu.hidden) return;
            menu.hidden = true;
            btn.setAttribute("aria-expanded", "false");
            if (refocus) btn.focus();
        }
        function sync(lang) {
            box.querySelectorAll(".lang-btn [data-flag]").forEach(function (f) {
                if (f.getAttribute("data-flag") === lang) f.removeAttribute("hidden");
                else f.setAttribute("hidden", "");
            });
            box.querySelector("[data-lang-code]").textContent = lang.toUpperCase();
            items.forEach(function (it) {
                it.setAttribute("aria-checked", it.getAttribute("data-set-lang") === lang ? "true" : "false");
            });
        }

        btn.addEventListener("click", function () {
            if (menu.hidden) open(); else close(false);
        });
        btn.addEventListener("keydown", function (e) {
            if (e.key === "ArrowDown" || e.key === "ArrowUp") {
                e.preventDefault();
                open(e.key === "ArrowDown" ? 0 : items.length - 1);
            }
        });
        menu.addEventListener("keydown", function (e) {
            var i = items.indexOf(document.activeElement);
            if (e.key === "Escape") { e.preventDefault(); close(true); }
            else if (e.key === "ArrowDown") { e.preventDefault(); items[(i + 1) % items.length].focus(); }
            else if (e.key === "ArrowUp") { e.preventDefault(); items[(i - 1 + items.length) % items.length].focus(); }
            else if (e.key === "Home") { e.preventDefault(); items[0].focus(); }
            else if (e.key === "End") { e.preventDefault(); items[items.length - 1].focus(); }
            else if (e.key === "Tab") { close(false); }
        });
        items.forEach(function (it) {
            it.addEventListener("click", function () {
                SLN.set(it.getAttribute("data-set-lang"));
                close(true);
            });
        });
        document.addEventListener("click", function (e) {
            if (!box.contains(e.target)) close(false);
        });
        document.addEventListener("keydown", function (e) {
            if (e.key === "Escape" && !menu.hidden) close(true);
        });

        sync(SLN.lang);
        SLN.onChange(sync);
    }

    /* ---------------- Outils SVG ---------------- */
    function el(name, attrs, parent) {
        var n = document.createElementNS(SVGNS, name);
        if (attrs) Object.keys(attrs).forEach(function (k) { n.setAttribute(k, attrs[k]); });
        if (parent) parent.appendChild(n);
        return n;
    }
    function text(parent, x, y, str, attrs) {
        var a = Object.assign({ x: x, y: y }, attrs || {});
        var n = el("text", a, parent);
        n.textContent = str;
        return n;
    }
    /* Coupe un libellé en lignes d'au plus maxChars caractères */
    function wrap(str, maxChars) {
        var words = String(str).split(" "), lines = [], line = "";
        words.forEach(function (w) {
            if ((line + " " + w).trim().length > maxChars && line) { lines.push(line); line = w; }
            else line = (line + " " + w).trim();
        });
        if (line) lines.push(line);
        return lines;
    }

    /* Infobulle partagée par graphique */
    function tooltip(container) {
        var tip = container.querySelector(".tip");
        if (!tip) {
            tip = document.createElement("div");
            tip.className = "tip";
            tip.hidden = true;
            tip.setAttribute("role", "status");
            container.appendChild(tip);
        }
        function place(clientX, clientY) {
            var r = container.getBoundingClientRect();
            var x = clientX - r.left + 14, y = clientY - r.top + 14;
            var w = tip.offsetWidth;
            if (x + w > r.width) x = Math.max(0, clientX - r.left - w - 14);
            tip.style.left = x + "px";
            tip.style.top = y + "px";
        }
        return {
            show: function (html, evt, anchor) {
                tip.innerHTML = html;
                tip.hidden = false;
                if (evt && evt.clientX !== undefined && evt.type.indexOf("mouse") === 0) place(evt.clientX, evt.clientY);
                else if (anchor) {
                    var b = anchor.getBoundingClientRect();
                    place(b.left + b.width / 2, b.top + b.height / 2);
                }
            },
            hide: function () { tip.hidden = true; }
        };
    }
    /* Rend un élément SVG survolable et atteignable au clavier */
    function hoverable(node, tip, html, label) {
        node.setAttribute("tabindex", "0");
        node.setAttribute("role", "img");
        node.setAttribute("aria-label", label || html.replace(/<[^>]+>/g, " ").replace(/\s+/g, " ").trim());
        node.addEventListener("mousemove", function (e) { tip.show(html, e); });
        node.addEventListener("mouseleave", tip.hide);
        node.addEventListener("focus", function (e) { tip.show(html, e, node); });
        node.addEventListener("blur", tip.hide);
    }

    /* ---------------- Données agrégées ---------------- */
    var dataPromise = null;
    function loadResults() {
        if (!dataPromise) {
            dataPromise = fetch("assets/data/resultats.json", { cache: "no-cache" }).then(function (r) {
                if (!r.ok) throw new Error("HTTP " + r.status);
                return r.json();
            });
        }
        return dataPromise;
    }

    var PAL = {
        marine: "#16324F", bleu: "#3E7CA6", bleu_clair: "#9BBBD4", sable: "#DAD3C2",
        encre: "#26313B", terracotta: "#A8552F", grid: "#EAE3D3"
    };

    function sigStars(p) { return p < 0.01 ? "***" : p < 0.05 ? "**" : p < 0.10 ? "*" : ""; }

    /* ---------------- Forêt des odds ratios (échelle log) ---------------- */
    function forest(container, rows, opts) {
        opts = opts || {};
        container.innerHTML = "";
        var lang = SLN.lang;
        var W = Math.max(300, container.clientWidth || 600);
        var narrow = W < 520;
        var labelW = narrow ? Math.round(W * 0.42) : Math.min(250, Math.round(W * 0.38));
        var maxChars = narrow ? 18 : 30;
        var rowH = narrow ? 34 : 30, top = 8, bottom = 44, right = 16;
        var H = top + rows.length * rowH + bottom;
        var x0 = labelW + 8, x1 = W - right;

        var lo = Math.min.apply(null, rows.map(function (r) { return r.lo; }).concat([1]));
        var hi = Math.max.apply(null, rows.map(function (r) { return r.hi; }).concat([1]));
        var llo = Math.log10(lo) - 0.05, lhi = Math.log10(hi) + 0.05;
        function sx(v) { return x0 + (Math.log10(v) - llo) / (lhi - llo) * (x1 - x0); }

        var svg = el("svg", { viewBox: "0 0 " + W + " " + H, width: W, height: H, role: "group",
            "aria-label": opts.title || "" }, container);
        var tip = tooltip(container);

        var ticks = [0.05, 0.1, 0.2, 0.3, 0.5, 0.7, 1, 1.5, 2, 3, 5, 7, 10, 20].filter(function (v) {
            return Math.log10(v) >= llo && Math.log10(v) <= lhi;
        });
        if (ticks.length > (narrow ? 5 : 8)) ticks = ticks.filter(function (v) { return [0.05, 0.1, 0.2, 0.5, 1, 2, 5, 10, 20].indexOf(v) !== -1; });
        var axisY = top + rows.length * rowH;
        ticks.forEach(function (v) {
            el("line", { x1: sx(v), x2: sx(v), y1: top, y2: axisY, stroke: v === 1 ? PAL.sable : PAL.grid,
                "stroke-width": v === 1 ? 1.6 : 1 }, svg);
            text(svg, sx(v), axisY + 16, SLN.num(v, v % 1 === 0 ? 0 : (Math.abs(v * 10 - Math.round(v * 10)) < 1e-9 ? 1 : 2)),
                { "text-anchor": "middle", "font-size": 12, fill: "#6b7280" });
        });
        text(svg, (x0 + x1) / 2, axisY + 36, SLN.t("js.or.axis"), { "text-anchor": "middle", "font-size": 12, fill: "#6b7280" });

        rows.forEach(function (r, i) {
            var cy = top + i * rowH + rowH / 2;
            var g = el("g", {}, svg);
            if (i % 2 === 0) el("rect", { x: 0, y: top + i * rowH, width: W, height: rowH, fill: "#f7f9fc" }, g);
            var lines = wrap(r.label, maxChars);
            lines.forEach(function (ln, k) {
                text(g, labelW, cy + (k - (lines.length - 1) / 2) * 13 + 4, ln,
                    { "text-anchor": "end", "font-size": narrow ? 12 : 13, fill: "#111827" });
            });
            var sig = r.p < 0.10;
            var col = sig ? PAL.terracotta : PAL.bleu_clair;
            el("line", { x1: sx(r.lo), x2: sx(r.hi), y1: cy, y2: cy, stroke: col, "stroke-width": 2 }, g);
            if (sx(r.hi) - sx(r.lo) > 16) {
                [r.lo, r.hi].forEach(function (v) {
                    el("line", { x1: sx(v), x2: sx(v), y1: cy - 5, y2: cy + 5, stroke: col, "stroke-width": 2 }, g);
                });
            }
            var px = sx(r.or);
            if (sig && r.or >= 1) el("path", { d: "M" + px + "," + (cy - 7) + " l6.5,11 h-13 z", fill: col, stroke: "#ffffff", "stroke-width": 1.2 }, g);
            else if (sig) el("path", { d: "M" + px + "," + (cy + 7) + " l6.5,-11 h-13 z", fill: col, stroke: "#ffffff", "stroke-width": 1.2 }, g);
            else el("circle", { cx: px, cy: cy, r: 5, fill: "#ffffff", stroke: PAL.bleu, "stroke-width": 1.8 }, g);

            var html = "<b>" + r.label + "</b><br>" + SLN.t("js.or.or") + " = " + SLN.num(r.or, 2) + sigStars(r.p) +
                "<br>" + SLN.t("js.or.ci") + " [" + SLN.num(r.lo, 2) + (lang === "fr" ? " ; " : ", ") + SLN.num(r.hi, 2) + "]" +
                "<br>p = " + SLN.num(r.p, 3);
            var hit = el("rect", { x: 0, y: top + i * rowH, width: W, height: rowH, fill: "transparent" }, g);
            hoverable(hit, tip, html);
        });
        return svg;
    }

    /* ---------------- Graphique d'odds ratios de memoire.html ---------------- */
    function initMemoireChart() {
        var panel = document.querySelector("[data-or-chart]");
        if (!panel) return;
        var chart = panel.querySelector(".chart");
        var note = panel.querySelector(".chart-note");
        var tabs = Array.prototype.slice.call(panel.querySelectorAll("[data-m]"));
        var vars = (panel.getAttribute("data-vars") || "").split(",");
        var state = { model: panel.getAttribute("data-start") || "Y3", data: null };

        function draw() {
            if (!state.data) return;
            var m = state.data.models[state.model];
            var rows = vars.map(function (v) {
                var r = m.or.filter(function (o) { return o.var === v; })[0];
                return r ? { label: SLN.lang === "fr" ? r.fr : r.en, or: r.or, lo: r.lo, hi: r.hi, p: r.p } : null;
            }).filter(Boolean);
            forest(chart, rows, { title: SLN.t("js.or.title." + state.model) });
            if (note) note.innerHTML = SLN.t("mem.or.note." + state.model);
        }
        function select(id, focus) {
            state.model = id;
            tabs.forEach(function (b) {
                var on = b.getAttribute("data-m") === id;
                b.setAttribute("aria-selected", on ? "true" : "false");
                b.tabIndex = on ? 0 : -1;
                if (on && focus) b.focus();
            });
            chart.setAttribute("aria-labelledby", "tab-" + id);
            draw();
        }
        tabs.forEach(function (b, i) {
            b.addEventListener("click", function () { select(b.getAttribute("data-m")); });
            b.addEventListener("keydown", function (e) {
                var d = e.key === "ArrowRight" ? 1 : e.key === "ArrowLeft" ? -1 : 0;
                if (!d) return;
                e.preventDefault();
                select(tabs[(i + d + tabs.length) % tabs.length].getAttribute("data-m"), true);
            });
        });
        loadResults().then(function (d) { state.data = d; select(state.model); })
            .catch(function () { chart.innerHTML = "<p class=\"small muted\">" + SLN.t("js.loadError") + "</p>"; });
        SLN.onChange(draw);
        var rt;
        window.addEventListener("resize", function () { clearTimeout(rt); rt = setTimeout(draw, 150); });
    }

    window.SLNCharts = {
        el: el, text: text, wrap: wrap, tooltip: tooltip, hoverable: hoverable,
        forest: forest, loadResults: loadResults, PAL: PAL, sigStars: sigStars
    };

    function init() {
        initSwitcher();
        initMemoireChart();
    }
    if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", init);
    else init();
})();
