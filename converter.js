

function binaryToBytes(binaryStr) {
    // Remove whitespace and newlines
    binaryStr = binaryStr.replace(/[\s\n]/g, '');
    
    // Validate binary string
    if (!/^[01]+$/.test(binaryStr)) {
        throw new Error('Input contains non-binary characters');
    }

    if (binaryStr.length % 8 !== 0) {
        throw new Error('Binary string length must be multiple of 8');
    }

    // Convert to bytes
    const bytes = new Uint8Array(binaryStr.length / 8);
    for (let i = 0; i < binaryStr.length; i += 8) {
        const byte = binaryStr.substr(i, 8);
        bytes[i / 8] = parseInt(byte, 2);
    }

    return bytes;
}

function displayFromBinary() {
    const binaryInput = document.getElementById('binaryInput').value;
    const preview = document.getElementById('binaryImage');
    const errorDiv = document.getElementById('error');
    
    try {
        // Convert binary to bytes
        const bytes = binaryToBytes(binaryInput);
        
        // Create blob and object URL
        const blob = new Blob([bytes], { type: 'image/png' });
        const url = URL.createObjectURL(blob);
        
        // Display the image
        preview.src = url;
        preview.style.display = 'block';
        errorDiv.textContent = ''; // Clear any previous errors
        
    } catch (error) {
        errorDiv.textContent = `Error: ${error.message}`;
        preview.style.display = 'none';
    }
}

function appendProgramCommand(cmd) {
    const stackEl = document.getElementById('programStack');
    if (!stackEl) return;
    const current = stackEl.value || '';
    const errEl = document.getElementById('programError');
    const existingLines = current
        .split(/\r?\n/)
        .map(l => l.trim())
        .filter(l => l.length > 0);
    const maxLines = 32;
    if (existingLines.length >= maxLines) {
        if (errEl) errEl.textContent = 'Program stack is full (max ' + maxLines + ' commands).';
        return;
    }
    if (errEl) errEl.textContent = '';
    const suffix = current && !current.endsWith('\n') ? '\n' : '';
    stackEl.value = current + suffix + cmd;
}

function encodeProgramToNano() {
    const stackEl = document.getElementById('programStack');
    const outEl = document.getElementById('programAmountsOutput');
    const errEl = document.getElementById('programError');

    if (!stackEl || !outEl || !errEl) return;

    const raw = stackEl.value || '';
    const cmds = raw
        .split(/\r?\n/)
        .map(l => l.trim())
        .filter(l => l.length > 0);

    if (cmds.length === 0) {
        errEl.textContent = 'Program stack is empty.';
        outEl.value = '';
        return;
    }

    // Very small example language: sequence of 'L' and 'R' characters
    const programString = cmds.join('');

    try {
        const amounts = encodeTextToNanoAmounts(programString);
        outEl.value = (amounts || []).join('\n');
        errEl.textContent = '';
    } catch (e) {
        errEl.textContent = 'Encoding error: ' + (e && e.message ? e.message : String(e));
        outEl.value = '';
    }
}

function runProgramFromNano() {
    const amountsEl = document.getElementById('programAmountsOutput');
    const errEl = document.getElementById('programError');
    const runner = document.getElementById('runner');

    if (!amountsEl || !errEl || !runner) return;

    const raw = amountsEl.value || '';
    const lines = raw
        .split(/\r?\n/)
        .map(l => l.trim())
        .filter(l => l.length > 0);

    if (lines.length === 0) {
        errEl.textContent = 'No encoded program to run.';
        return;
    }

    let program;
    try {
        program = decodeNanoAmountsToText(lines);
        errEl.textContent = '';
    } catch (e) {
        errEl.textContent = 'Decoding error: ' + (e && e.message ? e.message : String(e));
        return;
    }

    const commands = (program || '').split('').filter(c => c === 'L' || c === 'R' || c === 'U' || c === 'D');
    if (commands.length === 0) {
        errEl.textContent = 'Decoded program has no L/R/U/D commands.';
        return;
    }

    const container = runner.parentElement;
    if (!container) return;

    const containerWidth = container.clientWidth;
    const containerHeight = container.clientHeight;
    const obstacles = container.querySelectorAll('.runner-object');
    let x = containerWidth / 2;
    let bottom = 8;
    const stepX = Math.max(8, Math.floor(containerWidth / 20));
    const stepY = Math.max(4, Math.floor(containerHeight / 10));

    let i = 0;
    function stepOnce() {
        const cmd = commands[i];
        if (cmd === 'L') {
            x -= stepX;
        } else if (cmd === 'R') {
            x += stepX;
        } else if (cmd === 'U') {
            bottom += stepY;
        } else if (cmd === 'D') {
            bottom -= stepY;
        }

        const minX = 4;
        const maxX = containerWidth - 12;
        const minBottom = 2;
        const maxBottom = containerHeight - 24;

        x = Math.max(minX, Math.min(maxX, x));
        bottom = Math.max(minBottom, Math.min(maxBottom, bottom));

        runner.style.left = x + 'px';
        runner.style.bottom = bottom + 'px';
        runner.classList.remove('step');
        // trigger reflow for animation
        void runner.offsetWidth;
        runner.classList.add('step');

        const runnerRect = runner.getBoundingClientRect();
        let collided = false;
        obstacles.forEach(ob => {
            const oRect = ob.getBoundingClientRect();
            if (
                runnerRect.left < oRect.right &&
                runnerRect.right > oRect.left &&
                runnerRect.top < oRect.bottom &&
                runnerRect.bottom > oRect.top
            ) {
                collided = true;
            }
        });

        if (collided) {
            errEl.textContent = 'Collision detected!';
            return;
        }

        i += 1;
        if (i < commands.length) {
            setTimeout(stepOnce, 220);
        }
    }

    stepOnce();
}

// Optional: on file selection, immediately encode PNG to Nano amounts
function handleFileSelect(event) {
    // Ensure the file input reflects the selected file, then reuse the
    // main encoding helper to produce Nano amounts.
    encodeImageToNano();
}

// Initialize file input handler and UI behaviors
document.addEventListener('DOMContentLoaded', () => {
    // Use the existing file input instead of creating a new one
    const fileInput = document.getElementById('pngFileInput');
    if (fileInput) {
        fileInput.addEventListener('change', handleFileSelect);
    }
    positionRunnerObstacles();

    // Button click flash
    const buttons = document.querySelectorAll('.nano-button');
    buttons.forEach(btn => {
        btn.addEventListener('click', () => {
            btn.classList.remove('flash');
            void btn.offsetWidth; // reflow
            btn.classList.add('flash');
        });
    });
});

function appendBinary() {
    const displayBinary = document.getElementById('binaryInput').value.trim();
    const collectedArea = document.getElementById('collectedBinary');
    
    if (!displayBinary) {
        return; // Don't append if there's no binary data
    }

    const piFirst10 = "0.3141592653";
    const goldenRatioFirst10 = "0.1618033988";
    const primeFirst10 = "0.2357111317";

    // Clear the collection area first
    collectedArea.value = '';

    // Remove any extra newlines and construct the entry
    const newEntry = `${piFirst10}\n${displayBinary.replace(/\s+$/, '')}\n${goldenRatioFirst10}\n${primeFirst10}`;
    collectedArea.value = newEntry;
}

function copyFrom(textareaId) {
    const el = document.getElementById(textareaId);
    if (!el) return;
    const value = el.value || '';
    if (!value) return;
    try {
        navigator.clipboard.writeText(value);
    } catch (e) {
        // Fallback for older browsers: temporarily select the text
        el.focus();
        el.select();
        document.execCommand('copy');
    }
}

function clearField(elementId) {
    const el = document.getElementById(elementId);
    if (!el) return;
    el.value = '';
}

function encodeMessageToNano() {
    const plainEl = document.getElementById('messagePlain');
    const amountsOut = document.getElementById('messageAmountsOutput');
    const errorEl = document.getElementById('messageError');

    if (!plainEl || !amountsOut || !errorEl) return;

    const text = plainEl.value || '';
    if (text.length === 0) {
        errorEl.textContent = 'Message is empty.';
        amountsOut.value = '';
        return;
    }

    if (text.length > 500) {
        errorEl.textContent = 'Message exceeds 500 characters.';
        return;
    }

    try {
        const amounts = encodeTextToNanoAmounts(text);
        amountsOut.value = (amounts || []).join('\n');
        errorEl.textContent = '';
    } catch (e) {
        errorEl.textContent = 'Encoding error: ' + (e && e.message ? e.message : String(e));
        amountsOut.value = '';
    }
}

function decodeMessageFromNano() {
    const amountsIn = document.getElementById('messageAmountsInput');
    const decodedOut = document.getElementById('messageDecodedOutput');
    const errorEl = document.getElementById('messageError');

    if (!amountsIn || !decodedOut || !errorEl) return;

    const raw = amountsIn.value || '';
    const lines = raw
        .split(/\r?\n/)
        .map(l => l.trim())
        .filter(l => l.length > 0);

    if (lines.length === 0) {
        errorEl.textContent = 'No Nano amounts provided.';
        decodedOut.value = '';
        return;
    }

    try {
        const text = decodeNanoAmountsToText(lines);
        decodedOut.value = text;
        errorEl.textContent = '';
    } catch (e) {
        errorEl.textContent = 'Decoding error: ' + (e && e.message ? e.message : String(e));
        decodedOut.value = '';
    }
}

function encodeImageToNano() {
    const fileInput = document.getElementById('pngFileInput');
    const outputEl = document.getElementById('imageAmountsOutput');
    const errorEl = document.getElementById('imageError') || document.getElementById('error');
    const globalError = document.getElementById('error');

    if (!fileInput || !outputEl || !errorEl) return;

    const file = fileInput.files && fileInput.files[0];
    if (!file) {
        errorEl.textContent = 'Please choose an image file first.';
        outputEl.value = '';
        return;
    }

    if (file.size > 50 * 1024) {
        errorEl.textContent = 'File is larger than 50 KB limit.';
        outputEl.value = '';
        return;
    }

    const reader = new FileReader();
    reader.onload = function (e) {
        try {
            const bytes = new Uint8Array(e.target.result);
            const amounts = encodeBytesToNanoAmounts(bytes);
            outputEl.value = (amounts || []).join('\n');
            errorEl.textContent = '';
            if (globalError) globalError.textContent = '';
        } catch (err) {
            errorEl.textContent = 'Encoding error: ' + (err && err.message ? err.message : String(err));
            outputEl.value = '';
        }
    };
    reader.onerror = function () {
        errorEl.textContent = 'Error reading image file.';
        outputEl.value = '';
    };
    reader.readAsArrayBuffer(file);
}

function decodeImageFromNano() {
    const amountsIn = document.getElementById('imageAmountsInput');
    const imgEl = document.getElementById('binaryImage');
    const errorEl = document.getElementById('error');

    if (!amountsIn || !imgEl || !errorEl) return;

    const raw = amountsIn.value || '';
    const lines = raw
        .split(/\r?\n/)
        .map(l => l.trim())
        .filter(l => l.length > 0);

    if (lines.length === 0) {
        errorEl.textContent = 'No Nano amounts provided.';
        imgEl.style.display = 'none';
        imgEl.src = '';
        return;
    }

    try {
        const bytes = decodeNanoAmountsToBytes(lines);
        const blob = new Blob([bytes], { type: 'image/png' });
        const url = URL.createObjectURL(blob);
        imgEl.src = url;
        imgEl.style.display = 'block';
        errorEl.textContent = '';
    } catch (e) {
        errorEl.textContent = 'Decoding error: ' + (e && e.message ? e.message : String(e));
        imgEl.style.display = 'none';
        imgEl.src = '';
    }
}

function encodeBytesToNanoAmounts(bytes) {
    if (!(bytes instanceof Uint8Array)) {
        bytes = new Uint8Array(bytes);
    }

    const length = bytes.length >>> 0;
    if (length > 0xFFFFFFFF) {
        throw new Error('Data too large to encode (max 4,294,967,295 bytes)');
    }

    // Header: "NVM1" magic + 4-byte big-endian length
    const header = new Uint8Array(8);
    header[0] = 'N'.charCodeAt(0);
    header[1] = 'V'.charCodeAt(0);
    header[2] = 'M'.charCodeAt(0);
    header[3] = '1'.charCodeAt(0);
    header[4] = (length >>> 24) & 0xFF;
    header[5] = (length >>> 16) & 0xFF;
    header[6] = (length >>> 8) & 0xFF;
    header[7] = length & 0xFF;

    const payload = new Uint8Array(header.length + bytes.length);
    payload.set(header, 0);
    payload.set(bytes, header.length);

    // Convert payload bytes to BigInt (big-endian)
    let value = 0n;
    for (let i = 0; i < payload.length; i++) {
        value = (value << 8n) | BigInt(payload[i]);
    }

    const BASE = 99n; // digits 0..98 used, 99 reserved for padding
    const PAD_DIGIT = 99;

    // BigInt -> base-99 digits (most significant digit first)
    let digits;
    if (value === 0n) {
        digits = [0];
    } else {
        const tmp = [];
        while (value > 0n) {
            const rem = value % BASE;
            tmp.push(Number(rem)); // 0..98
            value /= BASE;
        }
        tmp.reverse();
        digits = tmp;
    }

    const CHUNK_SIZE = 15; // digits per transaction
    const result = [];
    let index = 0;

    while (index < digits.length) {
        const chunkDigits = digits.slice(index, index + CHUNK_SIZE);
        index += CHUNK_SIZE;

        while (chunkDigits.length < CHUNK_SIZE) {
            chunkDigits.push(PAD_DIGIT);
        }

        const pairs = chunkDigits.map(d => d.toString().padStart(2, '0'));
        const decimals = pairs.join(''); // 30 decimal places
        result.push('0.' + decimals);
    }

    return result;
}

function decodeNanoAmountsToBytes(amountStrings) {
    if (!Array.isArray(amountStrings)) {
        throw new Error('decodeNanoAmountsToBytes expects an array of strings');
    }

    const BASE = 99n;
    const PAD_DIGIT = 99;
    const digits = [];

    for (let i = 0; i < amountStrings.length; i++) {
        const raw = String(amountStrings[i]);
        const onlyDigits = raw.replace(/\D/g, '');

        if (onlyDigits.length < 30) {
            throw new Error('Amount at index ' + i + ' does not contain at least 30 digits');
        }

        const decimals = onlyDigits.slice(-30); // use the last 30 digits

        for (let j = 0; j < 30; j += 2) {
            const pair = decimals.slice(j, j + 2);
            const code = parseInt(pair, 10);

            if (Number.isNaN(code)) {
                throw new Error('Invalid digit pair in amount at index ' + i);
            }

            if (code === PAD_DIGIT) {
                continue; // padding, skip
            }

            if (code < 0 || code > 98) {
                throw new Error('Digit pair out of range (0-98) in amount at index ' + i);
            }

            digits.push(code);
        }
    }

    if (digits.length === 0) {
        return new Uint8Array(0);
    }

    // base-99 digits (MSB first) -> BigInt
    let value = 0n;
    for (let i = 0; i < digits.length; i++) {
        value = value * BASE + BigInt(digits[i]);
    }

    // BigInt -> bytes (big-endian)
    const bytesRev = [];
    while (value > 0n) {
        bytesRev.push(Number(value & 0xFFn));
        value >>= 8n;
    }

    if (bytesRev.length === 0) {
        return new Uint8Array(0);
    }

    bytesRev.reverse();
    const bytes = new Uint8Array(bytesRev);

    if (bytes.length < 8) {
        throw new Error('Decoded data too short to contain header');
    }

    if (bytes[0] !== 'N'.charCodeAt(0) ||
        bytes[1] !== 'V'.charCodeAt(0) ||
        bytes[2] !== 'M'.charCodeAt(0) ||
        bytes[3] !== '1'.charCodeAt(0)) {
        throw new Error('Invalid header magic');
    }

    const length = (((bytes[4] << 24) >>> 0) | (bytes[5] << 16) | (bytes[6] << 8) | bytes[7]) >>> 0;

    if (bytes.length < 8 + length) {
        throw new Error('Decoded data shorter than specified length');
    }

    return bytes.subarray(8, 8 + length);
}

function encodeTextToNanoAmounts(text) {
    const encoder = new TextEncoder();
    const bytes = encoder.encode(text);
    return encodeBytesToNanoAmounts(bytes);
}

function decodeNanoAmountsToText(amountStrings) {
    const bytes = decodeNanoAmountsToBytes(amountStrings);
    const decoder = new TextDecoder();
    return decoder.decode(bytes);
}
