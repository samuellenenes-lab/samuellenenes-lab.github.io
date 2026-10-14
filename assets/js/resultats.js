/* ==========================================================================
   resultats.html : reconstruction statique du tableau de bord app.R.
   Données : assets/data/resultats.json (agrégats calculés en R, aucune
   réponse individuelle). Graphiques en SVG, sans librairie.
   ========================================================================== */
(function () {
    "use strict";

    var C = window.SLNCharts;
    var el = C.el, text = C.text;
    var D = null;                 // résultats chargés
    var current = "ech";          // onglet affiché
    var simVar = {};              // variable choisie dans chaque simulateur
    var echVar = null;            // variable choisie dans l'onglet Échantillon

    function L(obj) { return SLN.lang === "fr" ? obj.fr : obj.en; }
    function t(k) { return SLN.t(k); }
    function svgRoot(container, W, H, label) {
        container.innerHTML = "";
        return el("svg", { viewBox: "0 0 " + W + " " + H, width: W, height: H, role: "img", "aria-label": label || "" }, container);
    }
    function heading(container) {   // titre de la carte, déjà traduit dans le DOM
        var c = container.closest(".card");
        var h = c && c.querySelector("h3");
        return h ? h.textContent.trim() : "";
    }
    function width(container) { return Math.max(260, container.clientWidth || 600); }
    function esc(s) { return String(s).replace(/&/g, "&amp;").replace(/</g, "&lt;"); }

    function table(container, head, rows, numCols) {
        var h = "<table><thead><tr>" + head.map(function (c, i) {
            return "<th scope=\"col\"" + (numCols.indexOf(i) !== -1 ? " class=\"n\"" : "") + ">" + c + "</th>";
        }).join("") + "</tr></thead><tbody>" + rows.map(function (r) {
            return "<tr>" + r.map(function (c, i) {
                var cls = [];
                if (numCols.indexOf(i) !== -1) cls.push("n");
                if (c && c.cls) cls.push(c.cls);
                var v = c && c.v !== undefined ? c.v : c;
                return "<td" + (cls.length ? " class=\"" + cls.join(" ") + "\"" : "") + ">" + v + "</td>";
            }).join("") + "</tr>";
        }).join("") + "</tbody></table>";
        container.innerHTML = h;
    }

    /* ---------------- Échantillon ---------------- */
    function fillEchSelect() {
        var sel = document.getElementById("sel-ech");
        var keep = echVar || D.sample.vars[0].id;
        sel.innerHTML = D.sample.vars.map(function (v) {
            return "<option value=\"" + v.id + "\">" + esc(L(v)) + "</option>";
        }).join("");
        sel.value = keep;
        echVar = keep;
    }
    function drawEch() {
        var v = D.sample.vars.filter(function (x) { return x.id === echVar; })[0];
        var box = document.getElementById("ch-ech");
        var W = width(box), narrow = W < 480;
        var labelW = narrow ? 120 : 190, rowH = 30, top = 6, bottom = 30, right = 70;
        var H = top + v.levels.length * rowH + bottom;
        var svg = svgRoot(box, W, H, L(v));
        var tip = C.tooltip(box);
        var max = Math.max.apply(null, v.levels.map(function (l) { return l.pct; }));
        var scaleMax = Math.ceil(max / 10) * 10;
        function sx(p) { return labelW + 8 + p / scaleMax * (W - labelW - 8 - right); }
        for (var g = 0; g <= scaleMax; g += scaleMax > 50 ? 20 : 10) {
            el("line", { x1: sx(g), x2: sx(g), y1: top, y2: H - bottom, stroke: C.PAL.grid }, svg);
            text(svg, sx(g), H - bottom + 16, SLN.num(g, 0), { "text-anchor": "middle", "font-size": 11, fill: "#6b7280" });
        }
        text(svg, sx(scaleMax / 2), H - 2, t("js.ech.axis"), { "text-anchor": "middle", "font-size": 11, fill: "#6b7280" });
        v.levels.forEach(function (l, i) {
            var y = top + i * rowH;
            var lines = C.wrap(L(l), narrow ? 16 : 26);
            lines.forEach(function (ln, k) {
                text(svg, labelW, y + rowH / 2 + 4 + (k - (lines.length - 1) / 2) * 12, ln,
                    { "text-anchor": "end", "font-size": 12, fill: "#111827" });
            });
            var bar = el("rect", { x: sx(0), y: y + 5, width: Math.max(1, sx(l.pct) - sx(0)), height: rowH - 10,
                fill: C.PAL.marine, rx: 2 }, svg);
            text(svg, sx(l.pct) + 6, y + rowH / 2 + 4, SLN.pct(l.pct, 1), { "font-size": 12, fill: "#111827" });
            C.hoverable(bar, tip, esc(L(l)) + (SLN.lang === "fr" ? " : " : ": ") + l.n + " " + t("js.households") +
                " (" + SLN.pct(l.pct, 1) + ")");
        });
        table(document.getElementById("tb-ech"), [t("js.ech.th.cat"), t("js.ech.th.n"), t("js.ech.th.pct")],
            v.levels.map(function (l) { return [esc(L(l)), l.n, SLN.num(l.pct, 1)]; }), [1, 2]);
    }

    /* ---------------- Scores ---------------- */
    function drawHist() {
        var box = document.getElementById("ch-hist");
        var W = width(box);
        var cols = W < 520 ? 1 : 2;
        var cellW = W / cols, cellH = 190;
        var rows = Math.ceil(D.scores.items.length / cols);
        var svg = svgRoot(box, W, rows * cellH + 24, heading(box));
        var tip = C.tooltip(box);
        var br = D.scores.breaks;
        var maxN = Math.max.apply(null, D.scores.items.map(function (s) { return Math.max.apply(null, s.hist); }));
        var yMax = Math.ceil(maxN / 10) * 10;
        D.scores.items.forEach(function (s, i) {
            var ox = (i % cols) * cellW, oy = Math.floor(i / cols) * cellH;
            var l = ox + 34, r = ox + cellW - 12, tp = oy + 26, bt = oy + cellH - 26;
            function sx(v) { return l + v / 100 * (r - l); }
            function sy(n) { return bt - n / yMax * (bt - tp); }
            text(svg, l, oy + 14, L(s), { "font-size": 12.5, "font-weight": 700, fill: C.PAL.marine });
            for (var g = 0; g <= yMax; g += yMax > 40 ? 20 : 10) {
                el("line", { x1: l, x2: r, y1: sy(g), y2: sy(g), stroke: C.PAL.grid }, svg);
                text(svg, l - 5, sy(g) + 4, String(g), { "text-anchor": "end", "font-size": 10, fill: "#6b7280" });
            }
            [0, 25, 50, 75, 100].forEach(function (v) {
                text(svg, sx(v), bt + 14, String(v), { "text-anchor": "middle", "font-size": 10, fill: "#6b7280" });
            });
            s.hist.forEach(function (n, k) {
                if (!n) return;
                var b = el("rect", { x: sx(br[k]) + 0.5, y: sy(n), width: sx(br[k + 1]) - sx(br[k]) - 1, height: bt - sy(n),
                    fill: C.PAL.bleu }, svg);
                C.hoverable(b, tip, esc(L(s)) + "<br>" + SLN.num(br[k], 0) + "-" + SLN.num(br[k + 1], 0) +
                    (SLN.lang === "fr" ? " : " : ": ") + n + " " + t("js.households"));
            });
            el("line", { x1: sx(s.mean_exact), x2: sx(s.mean_exact), y1: tp, y2: bt, stroke: C.PAL.terracotta, "stroke-width": 2 }, svg);
            el("line", { x1: sx(s.median_exact), x2: sx(s.median_exact), y1: tp, y2: bt, stroke: C.PAL.marine,
                "stroke-width": 1.6, "stroke-dasharray": "5 3" }, svg);
        });
        text(svg, W / 2, rows * cellH + 16, t("js.hist.x") + " · " + t("js.hist.y"),
            { "text-anchor": "middle", "font-size": 11, fill: "#6b7280" });

        table(document.getElementById("tb-scores"),
            [t("js.sc.th.score"), t("js.sc.th.mean"), t("js.sc.th.median"), t("js.sc.th.sd"), "Min", "Max"],
            D.scores.items.map(function (s) {
                return [esc(L(s)), SLN.num(s.mean, 1), SLN.num(s.median, 1), SLN.num(s.sd, 1), SLN.num(s.min, 1), SLN.num(s.max, 1)];
            }), [1, 2, 3, 4, 5]);
    }

    function mix(a, b, w) {   // interpolation de deux couleurs hexadécimales
        var pa = [1, 3, 5].map(function (i) { return parseInt(a.substr(i, 2), 16); });
        var pb = [1, 3, 5].map(function (i) { return parseInt(b.substr(i, 2), 16); });
        return "rgb(" + pa.map(function (v, i) { return Math.round(v + (pb[i] - v) * w); }).join(",") + ")";
    }
    function drawHeat() {
        var box = document.getElementById("ch-heat");
        var W = Math.min(360, width(box)), n = 4, pad = 30, cell = (W - pad) / n;
        var svg = svgRoot(box, W, pad + n * cell, heading(box));
        var tip = C.tooltip(box);
        var lab = ["X1", "X2", "X3", "X4"];
        lab.forEach(function (lb, i) {
            text(svg, pad + i * cell + cell / 2, 18, lb, { "text-anchor": "middle", "font-size": 12, "font-weight": 700, fill: C.PAL.marine });
            text(svg, pad - 6, pad + i * cell + cell / 2 + 4, lb, { "text-anchor": "end", "font-size": 12, "font-weight": 700, fill: C.PAL.marine });
        });
        D.scores.spearman.forEach(function (row, i) {
            row.forEach(function (rho, j) {
                var fill = rho >= 0 ? mix("#FFFDF7", C.PAL.marine, rho) : mix("#FFFDF7", C.PAL.terracotta, -rho);
                var r = el("rect", { x: pad + j * cell + 1, y: pad + i * cell + 1, width: cell - 2, height: cell - 2, fill: fill, rx: 3 }, svg);
                text(svg, pad + j * cell + cell / 2, pad + i * cell + cell / 2 + 5, SLN.num(rho, 2),
                    { "text-anchor": "middle", "font-size": 13, fill: rho > 0.5 ? "#ffffff" : C.PAL.encre, "pointer-events": "none" });
                C.hoverable(r, tip, lab[j] + " × " + lab[i] + (SLN.lang === "fr" ? " : " : ": ") + "rho = " + SLN.num(rho, 2));
            });
        });
    }

    /* ---------------- Acceptation Y ---------------- */
    function drawLikert() {
        var box = document.getElementById("ch-likert");
        var W = width(box), narrow = W < 480;
        var items = D.Y.slice().sort(function (a, b) { return b.fav - a.fav; });
        var labelW = narrow ? 120 : 210, rowH = narrow ? 40 : 36, top = 4, bottom = 30, right = 8;
        var H = top + items.length * rowH + bottom;
        var svg = svgRoot(box, W, H, heading(box));
        var tip = C.tooltip(box);
        var cols = D.palette.likert, names = SLN.lang === "fr" ? D.palette.likert_fr : D.palette.likert_en;
        function sx(p) { return labelW + 8 + p / 100 * (W - labelW - 8 - right); }
        [0, 25, 50, 75, 100].forEach(function (g) {
            text(svg, sx(g), H - bottom + 16, SLN.num(g, 0), { "text-anchor": "middle", "font-size": 11, fill: "#6b7280" });
        });
        text(svg, sx(50), H - 2, t("js.ech.axis"), { "text-anchor": "middle", "font-size": 11, fill: "#6b7280" });
        items.forEach(function (it, i) {
            var y = top + i * rowH;
            var lines = C.wrap(L(it), narrow ? 17 : 30);
            lines.forEach(function (ln, k) {
                text(svg, labelW, y + rowH / 2 + 4 + (k - (lines.length - 1) / 2) * 12, ln,
                    { "text-anchor": "end", "font-size": 12, fill: "#111827" });
            });
            var acc = 0;
            it.pct.forEach(function (p, k) {
                if (p <= 0) return;
                var r = el("rect", { x: sx(acc), y: y + 6, width: Math.max(0.5, sx(acc + p) - sx(acc)), height: rowH - 12, fill: cols[k] }, svg);
                if (sx(acc + p) - sx(acc) > 30) {
                    text(svg, (sx(acc) + sx(acc + p)) / 2, y + rowH / 2 + 4, SLN.num(p, 0),
                        { "text-anchor": "middle", "font-size": 11, fill: k >= 3 || k === 0 ? "#ffffff" : C.PAL.encre, "pointer-events": "none" });
                }
                C.hoverable(r, tip, esc(L(it)) + "<br>" + names[k] + (SLN.lang === "fr" ? " : " : ": ") + SLN.pct(p, 1));
                acc += p;
            });
        });
        document.getElementById("lg-likert").innerHTML = names.map(function (n, k) {
            return "<li><i style=\"background:" + cols[k] + "\"></i>" + n + "</li>";
        }).join("");

        table(document.getElementById("tb-y"),
            [t("js.y.th.m"), t("js.y.th.mean"), t("js.y.th.fav"), t("js.y.th.neu"), t("js.y.th.def")],
            D.Y.map(function (y) {
                return [esc(L(y)), SLN.num(y.mean, 2), SLN.num(y.fav, 1), SLN.num(y.neu, 1), SLN.num(y.def, 1)];
            }), [1, 2, 3, 4]);
    }

    /* ---------------- Modèles ---------------- */
    function niceTicks(a, b) {
        var span = b - a, raw = span / 4, mag = Math.pow(10, Math.floor(Math.log10(raw)));
        var step = [1, 2, 2.5, 5, 10].map(function (m) { return m * mag; }).filter(function (st) { return st >= raw; })[0];
        var out = [];
        for (var v = Math.ceil(a / step) * step; v <= b + 1e-9; v += step) out.push(Math.round(v * 1e6) / 1e6);
        return out;
    }
    function lineChart(box, grid, levels, colors, xLabel, isInt) {
        var W = width(box), H = 280;
        var l = 44, r = W - 12, tp = 10, bt = H - 44;
        var svg = svgRoot(box, W, H, xLabel);
        var tip = C.tooltip(box);
        var xs = grid.x, x0 = xs[0], x1 = xs[xs.length - 1];
        if (x1 === x0) x1 = x0 + 1;
        function sx(v) { return l + (v - x0) / (x1 - x0) * (r - l); }
        function sy(p) { return bt - p / 100 * (bt - tp); }
        [0, 20, 40, 60, 80, 100].forEach(function (g) {
            el("line", { x1: l, x2: r, y1: sy(g), y2: sy(g), stroke: C.PAL.grid }, svg);
            text(svg, l - 6, sy(g) + 4, String(g), { "text-anchor": "end", "font-size": 11, fill: "#6b7280" });
        });
        var ticks = isInt ? xs : niceTicks(x0, x1);
        ticks.forEach(function (v) {
            text(svg, sx(v), bt + 16, SLN.num(v, isInt || v % 1 === 0 ? 0 : 1),
                { "text-anchor": "middle", "font-size": 11, fill: "#6b7280" });
        });
        text(svg, (l + r) / 2, H - 8, xLabel, { "text-anchor": "middle", "font-size": 11.5, fill: "#374151" });
        text(svg, 12, (tp + bt) / 2, t("js.sim.y"), { "text-anchor": "middle", "font-size": 11.5, fill: "#374151",
            transform: "rotate(-90 12 " + ((tp + bt) / 2) + ")" });
        grid.p.forEach(function (serie, k) {
            var d = serie.map(function (p, i) { return (i ? "L" : "M") + sx(xs[i]).toFixed(1) + "," + sy(p).toFixed(1); }).join(" ");
            el("path", { d: d, fill: "none", stroke: colors[k], "stroke-width": 2.2 }, svg);
            if (xs.length <= 12) serie.forEach(function (p, i) {
                el("circle", { cx: sx(xs[i]), cy: sy(p), r: 3, fill: colors[k] }, svg);
            });
        });
        // zone de survol : une bande verticale par valeur de x
        xs.forEach(function (xv, i) {
            var a = i ? (sx(xs[i - 1]) + sx(xv)) / 2 : l, b = i < xs.length - 1 ? (sx(xv) + sx(xs[i + 1])) / 2 : r;
            var band = el("rect", { x: a, y: tp, width: Math.max(1, b - a), height: bt - tp, fill: "transparent" }, svg);
            var html = "<b>" + esc(xLabel) + " = " + SLN.num(xv, isInt ? 0 : 1) + "</b>" + levels.map(function (lv, k) {
                return "<br><span style=\"color:" + colors[k] + "\">■</span> " + esc(lv) +
                    (SLN.lang === "fr" ? " : " : ": ") + SLN.pct(grid.p[k][i], 1);
            }).join("");
            if (xs.length > 12 && i % 3) { band.setAttribute("aria-hidden", "true"); band.addEventListener("mousemove", function (e) { tip.show(html, e); }); band.addEventListener("mouseleave", tip.hide); }
            else C.hoverable(band, tip, html);
        });
    }

    function drawModel(id) {
        var M = D.models[id];
        var panel = document.getElementById("p-" + id);
        var q = function (k) { return panel.querySelector("[data-fill=\"" + k + "\"]"); };
        var s = M.stats, fr = SLN.lang === "fr";

        q("r2").textContent = SLN.num(s.mcfadden, 3);
        q("lrt").textContent = t("js.m.lrt") + " " + (s.p_lrt < 0.001 ? "< " + SLN.num(0.001, 3) : "= " + SLN.num(s.p_lrt, 3));
        q("pred").textContent = SLN.pct(s.pred, 1);
        q("base").textContent = t("js.m.vs") + " " + SLN.pct(s.base, 1) + " " + t("js.m.naive") + " · " +
            t("js.m.brant") + " " + SLN.num(M.brant_p, M.brant_p === 1 ? 2 : 3);

        var rows = M.or.map(function (o) { return { label: L(o), or: o.or, lo: o.lo, hi: o.hi, p: o.p }; });
        C.forest(q("forest"), rows, { title: t("js.or.title." + id) });

        var sel = q("simsel");
        if (!simVar[id]) simVar[id] = M.var_default;
        sel.innerHTML = M.or.map(function (o) {
            return "<option value=\"" + o.var + "\">" + esc(L(o)) + "</option>";
        }).join("");
        sel.value = simVar[id];
        if (!sel.dataset.bound) {
            sel.dataset.bound = "1";
            sel.addEventListener("change", function () { simVar[id] = sel.value; drawSim(id); });
        }
        drawSim(id);

        table(q("table"), [t("js.m.th.var"), t("js.m.th.or"), t("js.m.th.ci"), t("js.m.th.p"), t("js.m.th.sig")],
            M.or.map(function (o) {
                return [esc(L(o)), SLN.num(o.or, 2), "[" + SLN.num(o.lo, 2) + (fr ? " ; " : ", ") + SLN.num(o.hi, 2) + "]",
                    SLN.num(o.p, 3), { v: o.sig, cls: o.sig ? "sig" : "" }];
            }), [1, 2, 3, 4]);
    }
    function drawSim(id) {
        var M = D.models[id];
        var panel = document.getElementById("p-" + id);
        var v = simVar[id];
        var grid = M.grids.filter(function (g) { return g.var === v; })[0];
        var o = M.or.filter(function (r) { return r.var === v; })[0];
        var levels = SLN.lang === "fr" ? M.levels_fr : M.levels_en;
        var isInt = grid.x.length <= 12 && grid.x.every(function (x) { return Math.abs(x - Math.round(x)) < 1e-9; });
        lineChart(panel.querySelector("[data-fill=\"sim\"]"), grid, levels, D.palette.sim, L(o), isInt);
        panel.querySelector("[data-fill=\"simlegend\"]").innerHTML = levels.map(function (lv, k) {
            return "<li><i style=\"background:" + D.palette.sim[k] + "\"></i>" + esc(lv) + "</li>";
        }).join("");
    }

    /* ---------------- Onglets ---------------- */
    var tabs = [], panels = {};
    function draw() {
        if (!D) return;
        if (current === "ech") drawEch();
        else if (current === "scores") { drawHist(); drawHeat(); }
        else if (current === "y") drawLikert();
        else drawModel(current);
    }
    function select(id, focus, push) {
        current = id;
        tabs.forEach(function (b) {
            var on = b.id === "t-" + id;
            b.setAttribute("aria-selected", on ? "true" : "false");
            b.tabIndex = on ? 0 : -1;
            if (on && focus) b.focus();
        });
        Object.keys(panels).forEach(function (k) {
            if (k === id) panels[k].removeAttribute("hidden"); else panels[k].setAttribute("hidden", "");
        });
        if (push && window.history && history.replaceState) history.replaceState(null, "", "#" + id);
        draw();
    }

    function init() {
        tabs = Array.prototype.slice.call(document.querySelectorAll(".res-tabs [role=tab]"));
        tabs.forEach(function (b, i) {
            var id = b.id.slice(2);
            panels[id] = document.getElementById("p-" + id);
            b.addEventListener("click", function () { select(id, false, true); });
            b.addEventListener("keydown", function (e) {
                var d = e.key === "ArrowRight" ? 1 : e.key === "ArrowLeft" ? -1 : 0;
                var j = e.key === "Home" ? 0 : e.key === "End" ? tabs.length - 1 : (i + d + tabs.length) % tabs.length;
                if (!d && e.key !== "Home" && e.key !== "End") return;
                e.preventDefault();
                select(tabs[j].id.slice(2), true, true);
            });
        });
        document.getElementById("sel-ech").addEventListener("change", function (e) { echVar = e.target.value; drawEch(); });
        var h = (window.location.hash || "").slice(1);
        if (panels[h]) select(h, false, false);

        var status = document.querySelector("[data-res-status]");
        C.loadResults().then(function (d) {
            D = d;
            status.hidden = true;
            fillEchSelect();
            draw();
        }).catch(function () {
            status.innerHTML = t("js.loadErrorRes");
        });
        SLN.onChange(function () {
            if (!D) return;
            fillEchSelect();
            draw();
        });
        var rt;
        window.addEventListener("resize", function () { clearTimeout(rt); rt = setTimeout(draw, 150); });
    }
    if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", init);
    else init();
})();
