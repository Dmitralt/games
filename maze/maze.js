const readline = require('readline');

const styles = {
    reset: "\x1b[0m",
    bold: "\x1b[1m",
    dim: "\x1b[2m",
    red: "\x1b[31m",
    yellow: "\x1b[33m",
    yellowBright: "\x1b[93m",
    white: "\x1b[37m",
    gray: "\x1b[90m",
    blue: "\x1b[34m",
    blueBright: "\x1b[94m",
    cyan: "\x1b[36m",
    bgGreen: "\x1b[42m",
    bgBlue: "\x1b[44m",
    bgBlueBright: "\x1b[104m",
    bgCyan: "\x1b[46m",
};//For drawing 

const applyStyle = (text, ...codes) => codes.join('') + text + styles.reset;

function makeStyleProxy(currentStyles = []) {
    return new Proxy(() => { }, {
        get: (target, prop) =>
            prop === 'hex' || prop === 'bgHex'
                ? (colorCode) => (text) =>
                    applyStyle(text, `\x1b[${prop === 'hex' ? 38 : 48};2;${hexToRgb(colorCode).join(';')}m`, ...currentStyles)
                : styles[prop]
                    ? makeStyleProxy([...currentStyles, styles[prop]])
                    : (text) => applyStyle(text, ...currentStyles),
        apply: (target, thisArg, [text]) => applyStyle(text, ...currentStyles)
    });
}

const hexToRgb = (hex) => {
    const bigint = parseInt(hex.replace('#', ''), 16);
    return [(bigint >> 16) & 255, (bigint >> 8) & 255, bigint & 255];
};

const chalk = makeStyleProxy();

let isRendering = false;

const safeRender = () => {
    if (isRendering) return;
    isRendering = true;
    setImmediate(() => (render(), isRendering = false));
};

readline.emitKeypressEvents(process.stdin);
process.stdin.setRawMode(true);

const map = [
    [1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1],
    [1, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 1],
    [1, 0, 1, 1, 1, 1, 0, 0, 1, 1, 1, 1, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 1],
    [1, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 1],
    [1, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 1],
    [1, 0, 2, 2, 2, 2, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 1],
    [1, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 1],
    [1, 0, 2, 2, 0, 2, 2, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 1],
    [1, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 1],
    [1, 0, 3, 3, 3, 3, 3, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 1],
    [1, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 1],
    [1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1],
];
const collectibles = [
    { x: 2.5, y: 1.5, collected: false, type: 'pilar' },
    { x: 6.5, y: 1.5, collected: false, type: 'square' },
    { x: 4.5, y: 3.5, collected: false, type: 'pilar' },
    { x: 6.5, y: 6.5, collected: false, type: 'square' },
    { x: 8.5, y: 7.5, collected: false, type: 'pilar' },
    { x: 1.5, y: 9.5, collected: false, type: 'square' },
    { x: 11.5, y: 8.5, collected: false, type: 'pilar' }
];
const wallTextures = {
    1: ['█', '█', '█', '█', '█', '█', '█', '█'],
    2: ['▓', '▓', '▓', '▓', '▓', '▓', '▓', '▓'],
    3: ['▒', '▒', '▒', '▒', '▒', '▒', '▒', '▒']
};
const wallColors = {
    1: chalk.white,
    2: chalk.yellow,
    3: chalk.gray
};
const mapWidth = map[0].length;
const mapHeight = map.length;
let playerX = 1.5; // Старт
let playerY = 1.5;
let angle = 0;
let score = 0;
const FOV = Math.PI / 3;
const depth = 10;
const screenWidth = 360;
const screenHeight = 120;

const castRay = (rayAngle) => {
    let [distanceToWall, hit, boundary, wallType] = [0, false, false, 0];
    const [eyeX, eyeY, stepSize] = [Math.cos(rayAngle), Math.sin(rayAngle), 0.005];

    while (!hit && distanceToWall < depth) {
        distanceToWall += stepSize;
        const [testX, testY] = [playerX + eyeX * distanceToWall, playerY + eyeY * distanceToWall];

        if (Math.floor(testX) < 0 || Math.floor(testX) >= mapWidth || Math.floor(testY) < 0 || Math.floor(testY) >= mapHeight) {
            hit = true;
            distanceToWall = depth;
        } else {
            const [mapX, mapY] = [Math.floor(testX), Math.floor(testY)];
            if (map[mapY][mapX] > 0) {
                hit = true;
                wallType = map[mapY][mapX];
                const [cellX, cellY, edgeSize] = [testX - mapX, testY - mapY, 0.05];
                boundary = cellX < edgeSize || cellX > 1 - edgeSize || cellY < edgeSize || cellY > 1 - edgeSize;
                if (!boundary) {
                    const [nextMapX, nextMapY] = [Math.floor(testX + eyeX * stepSize), Math.floor(testY + eyeY * stepSize)];
                    boundary = nextMapX !== mapX || nextMapY !== mapY;
                }
            }
        }
    }
    return { distanceToWall, boundary, wallType };
};

const checkCollectibles = () => {
    collectibles.forEach(({ collected, x, y }) => {
        if (!collected && Math.sqrt((playerX - x) ** 2 + (playerY - y) ** 2) < 0.5) {
            score += 100;
            collected = true;
        }
    });
};

function render() {
    const screen = [];
    for (let y = 0; y < screenHeight; y++) {
        screen.push(Array(screenWidth).fill(' '));
    }

    for (let x = 0; x < screenWidth; x++) {
        const rayAngle = (angle - FOV / 2) + (x / screenWidth) * FOV;
        const { distanceToWall, boundary, wallType } = castRay(rayAngle);
        const wallHeight = Math.min(screenHeight, Math.floor(screenHeight / distanceToWall));
        const ceiling = Math.floor((screenHeight - wallHeight) / 2);
        const floor = Math.min(screenHeight - 1, ceiling + wallHeight);

        for (let y = 0; y < screenHeight; y++) {
            if (y >= screenHeight) continue;
            let char = ' ';
            if (y < ceiling) {
                const skyColors = [chalk.bgBlue, chalk.bgBlueBright, chalk.bgCyan];
                char = skyColors[Math.min(2, Math.floor((y / ceiling) * 3))](' ');
            } else if (y > ceiling && y <= floor) {
                const wallSection = Math.min(7, Math.max(0, Math.floor((y - ceiling) / (wallHeight / 8))));
                const texture = (wallTextures[wallType] || [' '])[wallSection];
                const shadingFactor = Math.max(0, 1 - distanceToWall / depth);
                const color = wallColors[wallType];

                const shade = boundary
                    ? color.dim(['░', '▒'][wallSection % 2])
                    : distanceToWall <= depth
                        ? shadingFactor > 0.7
                            ? color.bold(texture)
                            : shadingFactor > 0.4
                                ? color(texture)
                                : color.dim(texture)
                        : ' ';
                char = shade;
            } else {
                const floorDistance = (y - screenHeight / 2) / (screenHeight / 2);
                char = floorDistance < 0.3
                    ? chalk.bgGreen(' ')
                    : chalk.bgGreen.dim(' ');
            }
            if (y < screenHeight && x < screenWidth) {
                screen[y][x] = char;
            }
        }
    }

    const spritePatternSquare = [
        ['#FF0000', '#FF0000', '#FF0000', '#FF0000', '#FF0000', '#FF0000', '#FF0000', '#FF0000'],
        ['#FF0000', '#FFFF00', '#FFFF00', '#FF0000', '#FF0000', '#FFFF00', '#FFFF00', '#FF0000'],
        ['#FF0000', '#FFFF00', '#FF0000', '#FF0000', '#FF0000', '#FF0000', '#FFFF00', '#FF0000'],
        ['#FF0000', '#FFFF00', '#FFFF00', '#FF0000', '#FF0000', '#FFFF00', '#FFFF00', '#FF0000'],
        ['#FF0000', '#FF0000', '#FF0000', '#FF0000', '#FF0000', '#FF0000', '#FF0000', '#FF0000'],
        ['#FF0000', '#FFFF00', '#FFFF00', '#FFFF00', '#FFFF00', '#FFFF00', '#FFFF00', '#FF0000'],
        ['#FF0000', '#FF0000', '#FF0000', '#FF0000', '#FF0000', '#FF0000', '#FF0000', '#FF0000'],
        ['#000000', '#000000', '#000000', '#000000', '#000000', '#000000', '#000000', '#000000']
    ];

    collectibles.forEach(collectible => {
        if (!collectible.collected) {
            const dx = collectible.x - playerX;
            const dy = collectible.y - playerY;
            const distance = Math.sqrt(dx * dx + dy * dy);
            const angleToCollectible = Math.atan2(dy, dx);
            let relativeAngle = angleToCollectible - angle;
            while (relativeAngle > Math.PI) relativeAngle -= 2 * Math.PI;
            while (relativeAngle < -Math.PI) relativeAngle += 2 * Math.PI;
            if (Math.abs(relativeAngle) < FOV / 2) {
                const screenX = Math.floor((relativeAngle + FOV / 2) / FOV * screenWidth);
                const screenY = Math.floor(screenHeight / 2);
                const boxSize = Math.max(2, Math.floor(screenHeight / distance / 4));
                const halfBox = Math.floor(boxSize / 2);
                const block = (color) => chalk.bgHex(color)(' ');
                const { distanceToWall } = castRay(angleToCollectible);

                if (distance < distanceToWall) {
                    if (collectible.type === 'square') {  //dif types of objects on map
                        for (let dy = -halfBox; dy <= halfBox; dy++) {
                            for (let dx = -halfBox * 2; dx <= halfBox * 2; dx++) {
                                const patternY = Math.floor((dy + halfBox) * spritePatternSquare.length / (boxSize + 1));
                                const patternX = Math.floor((dx + halfBox * 2) * spritePatternSquare[0].length / (boxSize * 2 + 1));
                                const color = spritePatternSquare[patternY][patternX];

                                const x = screenX + dx;
                                const y = screenY + dy;

                                if (x >= 0 && x < screenWidth && y >= 0 && y < screenHeight) {
                                    screen[y][x] = block(color);
                                }
                            }
                        }
                    } else if (collectible.type === 'pilar') {
                        const starSymbol = '★';
                        const starHeight = Math.floor(screenHeight / distance);
                        const starColor = distance < 3
                            ? chalk.yellowBright.bold(starSymbol)
                            : distance < 5
                                ? chalk.yellow(starSymbol)
                                : chalk.hex('#999900')(starSymbol);

                        const halfHeight = Math.floor(starHeight / 2);
                        for (let i = -halfHeight; i <= halfHeight; i++) {
                            const y = screenY + i;
                            if (y >= 0 && y < screenHeight) {
                                screen[y][screenX] = starColor;
                            }
                        }
                    }
                }
            }
        }
    });

    process.stdout.write('\x1b[H');
    console.log(`x=${playerX.toFixed(2)} y=${playerY.toFixed(2)} angle=${angle.toFixed(2)} score: ${score}\n`);
    let output = '';
    output += `x=${playerX.toFixed(2)} y=${playerY.toFixed(2)} angle=${angle.toFixed(2)} score: ${score}\n`;
    screen.forEach(row => output += row.join('') + '\n');
    process.stdout.write('\x1b[H' + output);

    const directionToArrow = (angle) => {
        angle = (angle + Math.PI * 1.5) % (2 * Math.PI) - Math.PI;
        const arrows = ['↑', '↗', '→', '↘', '↓', '↙', '←', '↖'];
        return arrows[Math.floor((angle + Math.PI) / (Math.PI / 4)) % 8];
    };
    console.log('\мінімапа:');
    for (let y = 0; y < mapHeight; y++) {
        let row = map[y].map((cell, x) =>
            Math.floor(playerX) === x && Math.floor(playerY) === y
                ? chalk.red(directionToArrow(angle))
                : cell === 1
                    ? chalk.white('#')
                    : cell === 2
                        ? chalk.yellow('#')
                        : cell === 3
                            ? chalk.gray('#')
                            : chalk.gray('.')
        ).join('');
        console.log(row);
    }
}

const move = (dir) => {
    const speed = 0.1;
    const [dx, dy] = [Math.cos(angle) * speed * dir, Math.sin(angle) * speed * dir];
    const [nextX, nextY] = [playerX + dx, playerY + dy];
    if (!map[Math.floor(playerY)][Math.floor(nextX)]) playerX = nextX;
    if (!map[Math.floor(nextY)][Math.floor(playerX)]) playerY = nextY;
    checkCollectibles();
};

const rotate = (dir) => {
    angle = (angle + dir * 0.1 + Math.PI) % (2 * Math.PI) - Math.PI;
};

process.stdin.on('keypress', (_, { name, ctrl }) => {
    if (ctrl && name === 'c') process.exit();
    const actions = { w: () => move(1), s: () => move(-1), a: () => rotate(-1), d: () => rotate(1) };
    if (actions[name]) actions[name]();
    safeRender();
});

process.stdout.write('\x1bHЗапуск...\n');
safeRender();
