const content_dir = 'contents/'
const config_file = 'config.yml'
const section_names = ['home', 'awards', 'experience', 'publications'];


window.addEventListener('DOMContentLoaded', event => {

    // Activate Bootstrap scrollspy on the main nav element
    const mainNav = document.body.querySelector('#mainNav');
    if (mainNav) {
        new bootstrap.ScrollSpy(document.body, {
            target: '#mainNav',
            offset: 74,
        });
    };

    // Collapse responsive navbar when toggler is visible
    const navbarToggler = document.body.querySelector('.navbar-toggler');
    const responsiveNavItems = [].slice.call(
        document.querySelectorAll('#navbarResponsive .nav-link')
    );
    responsiveNavItems.map(function (responsiveNavItem) {
        responsiveNavItem.addEventListener('click', () => {
            if (window.getComputedStyle(navbarToggler).display !== 'none') {
                navbarToggler.click();
            }
        });
    });


    // Yaml
    fetch(content_dir + config_file)
        .then(response => response.text())
        .then(text => {
            const yml = jsyaml.load(text);
            Object.keys(yml).forEach(key => {
                try {
                    document.getElementById(key).innerHTML = yml[key];
                } catch {
                    console.log("Unknown id and value: " + key + "," + yml[key].toString())
                }

            })
        })
        .catch(error => console.log(error));


    // Marked
    marked.use({ mangle: false, headerIds: false })
    section_names.forEach((name, idx) => {
        fetch(content_dir + name + '.md')
            .then(response => response.text())
            .then(markdown => {
                const html = marked.parse(markdown);
                document.getElementById(name + '-md').innerHTML = html;
            }).then(() => {
                // MathJax
                MathJax.typeset();
            })
            .catch(error => console.log(error));
    })

}); 


// LeetCode CN public submission calendar heatmap.
// Only public calendar data is requested; no login cookie or account token is used.
async function renderLeetCodeHeatmap() {
    const status = document.getElementById('leetcode-heatmap-status');
    const chart = document.getElementById('leetcode-heatmap');
    const summary = document.getElementById('leetcode-heatmap-summary');
    if (!status || !chart || !summary) return;

    const username = 'nostalgic-nashf7i';
    const cacheKey = 'leetcode-heatmap-' + username;
    const now = new Date();
    const currentYear = now.getUTCFullYear();
    let calendars;

    try {
        const cached = JSON.parse(localStorage.getItem(cacheKey) || 'null');
        if (cached && cached.savedAt && Date.now() - cached.savedAt < 6 * 60 * 60 * 1000) {
            calendars = cached.calendars;
        }
    } catch (_) {}

    if (!calendars) {
        const query = 'query userProfileCalendar($username: String!, $year: Int) { matchedUser(username: $username) { userCalendar(year: $year) { streak totalActiveDays submissionCalendar } } }';
        const getYear = async (year) => {
            const target = 'https://leetcode.cn/graphql?' + new URLSearchParams({
                query,
                variables: JSON.stringify({ username, year })
            }).toString();
            const response = await fetch('https://proxy.cors.dev/' + target);
            if (!response.ok) throw new Error('HTTP ' + response.status);
            const payload = await response.json();
            const calendar = payload && payload.data && payload.data.matchedUser && payload.data.matchedUser.userCalendar;
            if (!calendar) throw new Error('未获取到公开日历数据');
            return {
                streak: Number(calendar.streak || 0),
                totalActiveDays: Number(calendar.totalActiveDays || 0),
                submissionCalendar: typeof calendar.submissionCalendar === 'string'
                    ? JSON.parse(calendar.submissionCalendar || '{}')
                    : (calendar.submissionCalendar || {})
            };
        };
        calendars = await Promise.all([getYear(currentYear - 1), getYear(currentYear)]);
        try { localStorage.setItem(cacheKey, JSON.stringify({ savedAt: Date.now(), calendars })); } catch (_) {}
    }

    const counts = {};
    calendars.forEach(calendar => {
        Object.entries(calendar.submissionCalendar).forEach(([stamp, count]) => {
            const numeric = Number(stamp);
            const date = Number.isFinite(numeric) && numeric > 1000000000
                ? new Date(numeric * 1000).toISOString().slice(0, 10)
                : String(stamp).slice(0, 10);
            counts[date] = Number(count) || 0;
        });
    });

    const end = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate()));
    const start = new Date(end);
    start.setUTCDate(start.getUTCDate() - 364);
    start.setUTCDate(start.getUTCDate() - start.getUTCDay());
    const days = [];
    for (let d = new Date(start); d <= end; d.setUTCDate(d.getUTCDate() + 1)) {
        days.push(new Date(d));
    }

    const ns = 'http://www.w3.org/2000/svg';
    const svg = document.createElementNS(ns, 'svg');
    svg.setAttribute('viewBox', '0 0 760 116');
    svg.setAttribute('width', '760');
    svg.setAttribute('height', '116');
    svg.setAttribute('role', 'img');
    svg.setAttribute('aria-label', '过去一年 LeetCode 每日提交活动热力图');
    const palette = ['#ebedf0', '#9be9a8', '#40c463', '#30a14e', '#216e39'];
    const monthSeen = new Set();
    days.forEach((date, index) => {
        const dateKey = date.toISOString().slice(0, 10);
        const count = counts[dateKey] || 0;
        const level = count === 0 ? 0 : count <= 2 ? 1 : count <= 5 ? 2 : count <= 9 ? 3 : 4;
        const week = Math.floor(index / 7);
        const weekday = date.getUTCDay();
        const rect = document.createElementNS(ns, 'rect');
        rect.setAttribute('x', String(week * 13 + 38));
        rect.setAttribute('y', String(weekday * 13 + 17));
        rect.setAttribute('width', '10');
        rect.setAttribute('height', '10');
        rect.setAttribute('rx', '2');
        rect.setAttribute('fill', palette[level]);
        const title = document.createElementNS(ns, 'title');
        title.textContent = dateKey + '：' + count + ' 次提交';
        rect.appendChild(title);
        svg.appendChild(rect);

        const monthKey = date.getUTCFullYear() + '-' + date.getUTCMonth();
        if (date.getUTCDate() <= 7 && !monthSeen.has(monthKey)) {
            monthSeen.add(monthKey);
            const label = document.createElementNS(ns, 'text');
            label.setAttribute('x', String(week * 13 + 38));
            label.setAttribute('y', '11');
            label.setAttribute('font-size', '9');
            label.setAttribute('fill', 'currentColor');
            label.textContent = (date.getUTCMonth() + 1) + '月';
            svg.appendChild(label);
        }
    });

    ['日', '一', '二', '三', '四', '五', '六'].forEach((day, i) => {
        if (i % 2 !== 0) return;
        const label = document.createElementNS(ns, 'text');
        label.setAttribute('x', '2');
        label.setAttribute('y', String(i * 13 + 25));
        label.setAttribute('font-size', '9');
        label.setAttribute('fill', 'currentColor');
        label.textContent = day;
        svg.appendChild(label);
    });

    chart.replaceChildren(svg);
    const totalActiveDays = calendars.reduce((sum, item) => sum + item.totalActiveDays, 0);
    const totalSubmissions = Object.values(counts).reduce((sum, count) => sum + count, 0);
    summary.textContent = '近两年活跃天数：' + totalActiveDays + ' 天 · 近两年提交次数：' + totalSubmissions + ' 次 · 当前连续活跃：' + calendars[1].streak + ' 天';
    status.textContent = '过去 365 天提交活动';
}

window.addEventListener('DOMContentLoaded', () => {
    renderLeetCodeHeatmap().catch(error => {
        const status = document.getElementById('leetcode-heatmap-status');
        if (status) status.textContent = '热力图暂时无法加载，请通过上方力扣主页查看最新记录。';
        console.warn('LeetCode heatmap unavailable:', error);
    });
});
