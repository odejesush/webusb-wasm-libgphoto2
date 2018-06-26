'use strict';
importScripts('gp.js');
importScripts('usb-ptp.js');

async function requestDevice(filters) {
  return new Promise((resolve, reject) => {
    postMessage({ command: 'requestDevice', filters: filters });
    self.addEventListener('message', async(event) => {
      if (event.data.command === 'getDevice') {
        if (devInx === -1)
          reject('requestDevice failed');
          return;
        let devices = await navigator.usb.getDevices();
        if (event.data.devInx < devices.length)
          resolve(devices[devInx]);
        else
          reject('Device was disconnected.');
      }
    });
  });
}

function displayProgress(text) {
  postMessage({ command: 'displayProgress', text: text });
}

function createImage(blob) {
  postMessage({ command: 'createImage', blob: blob });
}

function drawImage(blob) {
  postMessage({ command: 'drawImage', blob: blob });
}

onmessage = event => {
  switch(event.data.command) {
    case 'fileCapture':
      fileCapture();
      break;
    case 'preview':
      preview();
      break;
    default:
      break;
  }
};
