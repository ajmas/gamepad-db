let controllerIndex = {};
let controllerInfo;
let activeControllers = {};

const gamepads = {};
const initialAxes = [];
let timeoutId = undefined;

async function loadIndex () {
  const response = await axios.get('/controllers/index.json');
  controllerIndex = response.data?.controllers || [];
  console.log('xxxx', controllerIndex);
}

async function fetchController (id) {
  const response = await axios.get(`/controllers/${id}.json`);
  return response.data;
}

function log (...data) {
  console.log(data);
  const element = document.querySelector('#output');
  element.innerHTML += data;
  element.innerHTML += '\n';
}

function processGamePad (gamepad) {
  const buttonsPreseed = {};

  for (let i = 0; i < gamepad.buttons.length; i++) {
    const elementId = `#gamepad-${gamepad.index}-button-${i} .state`;
    const element = document.querySelector(elementId);
    if (!element) {
      console.error(`Can't find element ${elementId}`);
      continue;
    }
    if (gamepad.buttons[i].pressed) {
      buttonsPreseed[`button-${i}`] = true;
      // document.querySelector(`#button-${i} .state`).innerHTML = `PRESSED ${labels[i]}`;
      element.innerHTML = `PRESSED (${gamepad.buttons[i].value})`;
      element.classList.add('pressed');
      anyPressed = true;
    } else {
      element.innerHTML = ''; // -------'
      element.classList.remove('pressed');;
    }
  }

  for (let i = 0; i < gamepad.axes.length; i++) {
    let direction = '';
    if (gamepad.axes[i] !== initialAxes[i]) {
      buttonsPreseed[`axes-${i}`] = gamepad.axes[i];
      anyPressed = true;
    }
    const element = document.querySelector(`#gamepad-${gamepad.index}-axes-${i} .state`);
    if (element) {
      element.innerHTML = typeof gamepad.axes[i] === 'number' ? gamepad.axes[i] : JSON.stringify(gamepad.axes[i]);
    }
  }
}

function gameLoop() {
  const gamepads = navigator.getGamepads();
  for (let i = 0; i < gamepads.length; i++) {
    if (gamepads[i]) {
      processGamePad(gamepads[i]);
    }
  }
  requestAnimationFrame(gameLoop);
}

function gamepadHandler(event, connected) {
  const gamepad = event.gamepad;
  if (connected) {
    gamepads[gamepad.index] = gamepad;
  } else {
    delete gamepads[gamepad.index];
  }
}

function addGamePad (idx, gamepad) {
  const elementId = `gamepad-${idx}`;
  let html = `<div id="${elementId}" class="gamecontroller">`;
  html += '<div class="logo"><img src="" /></div>';
  html += '<h3>Buttons</h3><div class="buttons"></div><h3>Axes</h3><div class="axes"></div>';
  html += '<pre class="info"></div>';
  html += '</div>';

  const element = document.querySelector('#gamecontrollers');
  element.innerHTML += html;
  return elementId;
}

async function init () {
  console.log('init');
  await loadIndex();

  window.addEventListener("gamepadconnected", async (event) => {
    console.log('connected');
    const gamepad = event.gamepad;
    let gamepadEntry = controllerIndex.find(controller => controller.gamepadApiId === gamepad.id);
    if (gamepadEntry) {
      try {
        controllerInfo = await fetchController(gamepadEntry.shortId);
      } catch (error) {
        console.log('Not found', error);
      }
    }

    console.log('III', gamepad.index);

    const elementId = addGamePad(gamepad.index, gamepad);
    const infoElement = document.querySelector(`#${elementId} .info`);

    console.log('xxxx', gamepad.id, controllerInfo);
    gamepadHandler(event, true);

    infoElement.innerHTML += `Index ................ : ${gamepad.index}\n`;
    infoElement.innerHTML += `ID ................... : ${gamepad.id}\n`;
    infoElement.innerHTML += `Button count ......... : ${gamepad.buttons.length}\n`;
    infoElement.innerHTML += `Axes count ........... : ${gamepad.axes.length}\n`;
    infoElement.innerHTML += `Vibration Actuator ... : ${!!gamepad.vibrationActuator?.playEffect}\n`;
    infoElement.innerHTML += `Mapping .............. : ${JSON.stringify(gamepad.mapping)} ${gamepad.mapping.length}\n`;
    if (gamepad.mapping?.length > 0) {
      infoElement.innerHTML += `Mapping .............. : ${JSON.stringify(gamepad.mapping)} ${Array.from(Object.entries(gamepad.mapping).map(entry => `${entry[0]}:${entry[1]}`)).join(', ')}\n`;
    }
    infoElement.innerHTML += `Vendor ............... : ${controllerInfo?.vendorName}\n`;

    let html = '';

    const buttons = (controllerInfo?.inputs?.buttons) || [];
    for (let i = 0; i < gamepad.buttons.length; i++) {
      const indexLabel = `${i}`.padStart(2, '0');
      const label = `${indexLabel} ${(buttons[i]?.label ?? '')}`.padEnd(20, '.');
      html += `<div class="input" id="gamepad-${gamepad.index}-button-${i}"><div class="idx">${label}</div><div class="state">[ ----- ]</div></div>`;
    }

    document.querySelector(`#${elementId} .buttons`).innerHTML = html;

    html = '';
    const axes = (controllerInfo?.inputs?.axes) || [];
    for (let i = 0; i < gamepad.axes.length; i++) {
      const indexLabel = `${i}`.padStart(2, '0');
      const label = `${indexLabel} ${(axes[i]?.label ?? '')}`.padEnd(20, '.');
      initialAxes.push(gamepad.axes[i]);
      html += `<div class="input" id="gamepad-${gamepad.index}-axes-${i}"><div class="idx">${label}</div><div class="state">${axes[i]}</div></div>`;
    }

    document.querySelector(`#${elementId} .axes`).innerHTML = html;

    if (controllerInfo?.vendorName) {
      document.querySelector(`#${elementId} .logo img`).src = `/images/logos/${controllerInfo?.vendorName.toLowerCase()}.svg`;
    }

    timeoutId = gameLoop();
  });

  window.addEventListener("gamepaddisconnected", (e) => {
    gamepadHandler(e, false);
    log(
      "Gamepad disconnected from index %d: %s",
      e.gamepad.index,
      e.gamepad.id
    );
  });
}

document.addEventListener('DOMContentLoaded', () => {
  init().catch(error => console.error(error));
  log('Hello world. Ready for gamepads...');
});
