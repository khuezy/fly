// This is very shitty code, hacked to inject the time formatter onto the Live Logs dashboard (https://fly.io/apps/<some-app>/monitoring)
// The dashboard uses some weird websocket event listener that attaches globally and rerenders the entire page and not the child components... hence the hackery
const LS_KEY = 'fly_local_time'


async function waitForSelector(selector, interval = 100, maxAttempts = 50) {
    return new Promise((resolve, reject) => {
        let attempts = 0

        const checkSelector = setInterval(() => {
            const element = document.querySelector(selector);
            if (element) {
                clearInterval(checkSelector)
                return resolve(element)
            } else if (attempts >= maxAttempts) {
                clearInterval(checkSelector)
                return reject(`Element with selector "${selector}" not found after ${maxAttempts * interval}ms`)
            }
            attempts++
        }, interval)
    })
}

async function addTimeSelector() {
    const OPTIONS = ['utc', 'local', 'machine']

    const targetElement = await  waitForSelector('form header div:nth-child(2) > div')
    if (targetElement) {
        if (document.getElementById('yolo')) return

        const dropDown = document.createElement('div')
        dropDown.className = 'relative flex-grow focus-within:z-10'
        const select = document.createElement('select')
        select.id='yolo'
        select.className = targetElement.querySelector('select').className
        const pref = localStorage.getItem(LS_KEY) || 'utc'
        OPTIONS.forEach(item => {
            const option = document.createElement('option')
            option.textContent = item
            option.value = item
            option.selected = pref === item
            select.appendChild(option)
        })
        select.onchange = e => {
            localStorage.setItem(LS_KEY, e.target.value)
        }

        dropDown.appendChild(select)
        targetElement.prepend(dropDown);

    }
};
window.onload = () => {
    const observer = new MutationObserver((mutationsList) => {
        for (const mutation of mutationsList) {
            if (mutation.type === 'childList' || mutation.type === 'subtree') {
                addTimeSelector();
                updateTimes()
            }
        }
    });

    const console = document.getElementById('console')
    observer.observe(console, { childList: true, subtree: true })
}

function updateTimes() {
    const pref = localStorage.getItem(LS_KEY) || 'utc'
    const consoleLines = document.querySelectorAll('#console > p > span:first-child')

    const TZ_MAP = {
        "ams": "Europe/Amsterdam",
        "arn": "Europe/Stockholm",
        "atl": "America/New_York",
        "bog": "America/Bogota",
        "bom": "Asia/Kolkata",
        "bos": "America/New_York",
        "cdg": "Europe/Paris",
        "den": "America/Denver",
        "dfw": "America/Chicago",
        "ewr": "America/New_York",
        "eze": "America/Argentina/Buenos_Aires",
        "fra": "Europe/Berlin",
        "gdl": "America/Mexico_City",
        "gig": "America/Sao_Paulo",
        "gru": "America/Sao_Paulo",
        "hkg": "Asia/Hong_Kong",
        "iad": "America/New_York",
        "jnb": "Africa/Johannesburg",
        "lax": "America/Los_Angeles",
        "lhr": "Europe/London",
        "mad": "Europe/Madrid",
        "mia": "America/New_York",
        "nrt": "Asia/Tokyo",
        "ord": "America/Chicago",
        "otp": "Europe/Bucharest",
        "phx": "America/Phoenix",
        "qro": "America/Mexico_City",
        "scl": "America/Santiago",
        "sea": "America/Los_Angeles",
        "sin": "Asia/Singapore",
        "sjc": "America/Los_Angeles",
        "syd": "Australia/Sydney",
        "waw": "Europe/Warsaw",
        "yul": "America/Montreal",
        "yyz": "America/Toronto"
        }

    consoleLines.forEach(line => {
        let time = line.getAttribute('aria-time')
        if (!time) {
            time = line.textContent
            line.setAttribute('aria-time', time+'Z')
        }
        const d = new Date(time)
        if (isNaN(d.getTime())) return

        switch (pref) {
            case 'local':
                line.textContent = formatDateToISO(d)
            break
            case 'machine':
                
                const region = line.nextElementSibling.nextElementSibling.textContent
                const tz = TZ_MAP[region]
                if (!tz) return
                line.textContent = formatDateToISO(d, tz)
                break
            default:
        }
    })
}


function formatDateToISO(date, timeZone) {
    const options = {
        year: 'numeric',
        month: '2-digit',
        day: '2-digit',
        hour: '2-digit',
        minute: '2-digit',
        second: '2-digit',
        fractionalSecondDigits: 3,
        timeZone,
        hour12: false
    }

    const formatter = new Intl.DateTimeFormat('en-US', options)
    const parts = formatter.formatToParts(date)

    const dateParts = {}
    parts.forEach(part => {
        dateParts[part.type] = part.value
    })

    return`${dateParts.year}-${dateParts.month}-${dateParts.day}T${dateParts.hour}:${dateParts.minute}:${dateParts.second}.${String(date.getMilliseconds()).padStart(3, '0')}`
}
