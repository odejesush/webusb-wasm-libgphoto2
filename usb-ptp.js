EmterpreterAsync.ensureInit();

let usb = null;
let usbDevice;

// These constants represent C void** types. These are used to allocate memory
// for libgphoto2 library objects.
const ptr_ptr = Module._malloc(4);
const ptr_ptr2 = Module._malloc(4);

// These constants represent the 32-bit value of the memory address pointed to
// by ptr_ptr and ptr_ptr2 respectively.
const ptr_data = new Uint32Array(Module.HEAPU32.buffer, ptr_ptr, 1);
const ptr_data2 = new Uint32Array(Module.HEAPU32.buffer, ptr_ptr2, 1);

// Create a Camera* and store it in |camera_ptr|.
// The camera object represents a camera attached to the system.
Module._gp_camera_new(ptr_ptr);
const camera_ptr = ptr_data[0];

// Create a GPContext* and store it in |context_ptr|.
// The GPContext is used to handle callbacks and errors as well as other things.
// It is passed around by functions.
const context_ptr = Module._gp_context_new();

// Create a CameraAbilitiesList* and store it in |abilities_list_ptr|.
// This list stores the supported camera models and their abilities.
Module._gp_abilities_list_new(ptr_ptr);
const abilities_list_ptr = ptr_data[0];

// Scan the system for camera drivers
Module._gp_abilities_list_load(abilities_list_ptr, context_ptr);

// Create a CameraAbilities* and store it in |abilities_ptr|.
const abilities_ptr = Module._custom_camera_abilities_new();

// Populate the filters to use for requesting a USB device through the WebUSB
// API. The filters are populated by iterating through the CameraAbilitiesList*
// and grabbing the vendor ID and product ID for each CameraAbilities.
function getFilters() {
  const num_abilities = Module._gp_abilities_list_count(abilities_list_ptr);
  const filters = [];
  for (let i = 0; i < num_abilities; i++) {
    Module._gp_abilities_list_get_abilities(abilities_list_ptr, i,
        abilities_ptr);
    filters.push({
      vendorId: Module._custom_usb_vendor(abilities_ptr),
      productId: Module._custom_usb_product(abilities_ptr)
    });
  }
  return filters;
}

async function fileCapture() {
  let devices = await navigator.usb.getDevices();
  if (devices.length < 1)
    return;

  let device = devices[0];
  usb = new UsbPTP(device);

  const filters = getFilters();
  const idx = filters.findIndex((filter) => {
    return filter.vendorId == device.vendorId &&
      filter.productId == device.productId;
  });

  Module._gp_abilities_list_get_abilities(abilities_list_ptr, idx, abilities_ptr);
  Module._custom_camera_set_abilities(camera_ptr, abilities_ptr);

  await call('gp_camera_init', null, ['number', 'number'], [camera_ptr, context_ptr]);

  /* const text_ptr = Module._custom_camera_text_new();
  await call('gp_camera_get_summary', null, ['number', 'number', 'number'], [camera_ptr, text_ptr, context_ptr]);
  Module._custom_print_camera_text(text_ptr); */

  Module._gp_list_new(ptr_ptr);
  const list_ptr = ptr_data[0];

  const folders = ['/'];
  for (let i = 0; i < folders.length; i++) {
    await call('custom_gp_camera_folder_list_folders', null, ['number', 'string', 'number', 'number'],
      [camera_ptr, folders[i], list_ptr, context_ptr]);

    const count = Module._gp_list_count(list_ptr);
    for (let j = 0; j < count; j++) {
      Module._gp_list_get_name(list_ptr, j, ptr_ptr);
      folders.push(`${folders[i]}${Module.UTF8ToString(ptr_data[0])}/`);
    }

    displayProgress(`Found ${folders.length} folders`);

    Module._gp_list_reset(list_ptr);
  }

  const files = [];
  for (let i = 0; i < folders.length; i++) {
    await call('custom_gp_camera_folder_list_files', null, ['number', 'string', 'number', 'number'],
      [camera_ptr, folders[i], list_ptr, context_ptr]);

    const count = Module._gp_list_count(list_ptr);
    for (let j = 0; j < count; j++) {
      Module._gp_list_get_name(list_ptr, j, ptr_ptr);
      files.push({
        folder: folders[i],
        file: Module.UTF8ToString(ptr_data[0]),
      });
    }

    displayProgress(`Found ${files.length} files`);

    Module._gp_list_reset(list_ptr);
  }

  for (let file of files) {
    console.log(file);

    Module._gp_file_new(ptr_ptr);
    const file_ptr = ptr_data[0];

    Module.ccall('gp_file_open', null, ['number', 'string'], [file_ptr, file.folder + file.file]);

    await call('gp_camera_file_get', null, ['number', 'string', 'string', 'number', 'number', 'number'],
      [camera_ptr, file.folder, file.file, 0, file_ptr, context_ptr]);

    Module._gp_file_detect_mime_type(file_ptr);
    Module._gp_file_get_mime_type(ptr_ptr);
    const mimeType = Module.UTF8ToString(ptr_data[0]);

    Module._gp_file_get_data_and_size(file_ptr, ptr_ptr, ptr_ptr2);
    const arrayBuffer = Module.HEAP8.slice(ptr_data[0], ptr_ptr2[0]);
    const blob = new Blob([new Uint8Array(Module.HEAP8.buffer,
          ptr_data[0], ptr_ptr2[0])], { type: mimeType });
    createImage(blob);

    Module._gp_file_free(file_ptr);
  }

  console.log(folders);
  console.log(files);

  Module._gp_list_free(list_ptr);
  Module._gp_camera_exit(camera_ptr, context_ptr);
}

async function preview() {
  let devices = await navigator.usb.getDevices();
  if (devices.length < 1)
    return;

  let device = devices[0];
  usb = new UsbPTP(device);

  const idx = filters.findIndex((filter) => {
    return filter.vendorId == device.vendorId &&
      filter.productId == device.productId;
  });

  Module._gp_abilities_list_get_abilities(abilities_list_ptr, idx, abilities_ptr);
  Module._custom_camera_set_abilities(camera_ptr, abilities_ptr);

  await call('gp_camera_init', null, ['number', 'number'], [camera_ptr, context_ptr]);
  // Module._gp_camera_init(camera_ptr, context_ptr);

  /* const text_ptr = Module._custom_camera_text_new();
  await call('gp_camera_get_summary', null, ['number', 'number', 'number'], [camera_ptr, text_ptr, context_ptr]);
  Module._custom_print_camera_text(text_ptr);*/

  Module._gp_file_new(ptr_ptr);
  const file_ptr = ptr_data[0];

  for (let i = 0; i < 600; i++) {
    await call('gp_camera_capture_preview', null, ['number', 'number', 'number'], [camera_ptr, file_ptr, context_ptr]);

    Module._gp_file_detect_mime_type(file_ptr);
    Module._gp_file_get_mime_type(ptr_ptr);
    const mimeType = Module.UTF8ToString(ptr_data[0]);

    Module._gp_file_get_data_and_size(file_ptr, ptr_ptr, ptr_ptr2);
    const arrayBuffer = Module.HEAP8.slice(ptr_data[0], ptr_ptr2[0]);
    const blob = new Blob([new Uint8Array(Module.HEAP8.buffer, ptr_data[0], ptr_ptr2[0])], { type: mimeType });
    drawImage(blob);
  }

  Module._gp_camera_exit(camera_ptr, context_ptr);
}

function doAsync(func, returnAddress) {
  EmterpreterAsync.handle(function (resume) {
    func().then((returnValue) => {
      if (ABORT) return;
      if (returnAddress) {
        HEAP32[returnAddress >> 2] = returnValue;
      }
      resume();
    });
  });
}

function call(ident, returnType, argTypes, args) {
  Module.ccall(ident, null, argTypes || [], args || [], { async: true });
  return new Promise((resolve) => {
    EmterpreterAsync.asyncFinalizers.push((function () {
      resolve(returnType == 'number' ? HEAP32[EMTSTACKTOP >> 2] : undefined);
    }));
  });
}

class UsbPTP {
  constructor(device) {
    this.device = device;
    this.bulkOut = null;
    this.bulkIn = null;
    this.maxpacketsize = 0;

    this.init();
  }

  init() {
    for (let configuration of this.device.configurations) {
      for (let interface_ of configuration.interfaces) {
        for (let alternate of interface_.alternates) {
          for (let endpoint of alternate.endpoints) {
            this.maxpacketsize =
                Math.max(this.maxpacketsize, endpoint.packetSize);

            if (endpoint.type == 'bulk' && endpoint.direction == 'out') {
              if (this.bulkOut === null) {
                this.bulkOut = endpoint.endpointNumber;
              } else {
                console.warning('found two bulkOut endpoints.');
              }
            }

            if (endpoint.type == 'bulk' && endpoint.direction == 'in') {
              if (this.bulkIn === null) {
                this.bulkIn = endpoint.endpointNumber;
              } else {
                console.warning('found two bulkIn endpoints.');
              }
            }
          }
        }
      }
    }
  }

  async open() {
    try {
      await this.device.open();
      await this.device.selectConfiguration(1);
      console.log(this.device.configuration.interfaces[0].interfaceNumber);
      await this.device.claimInterface(
          this.device.configuration.interfaces[0].interfaceNumber);
    } catch (err) {
      console.error(err.name);
      console.error(err.message);
    }
  }

  async write(dataAddress, dataLength) {
    const writeData = new Uint8Array(HEAP8.buffer, dataAddress, dataLength);
    const result = await this.device.transferOut(this.bulkOut, writeData);
    return result.bytesWritten;
  }

  async read(dataAddress, dataLength) {
    const result = await this.device.transferIn(this.bulkIn, dataLength);

    // Copy the result back in the HEAP.
    const srcData = new Uint8Array(
        result.data.buffer, result.data.byteOffset, result.data.byteLength);
    const dstData = new Uint8Array(HEAP8.buffer, dataAddress, dataLength);
    dstData.set(srcData);

    return result.data.byteLength;
  }

  async controlWrite(request, value, index, dataAddress, dataLength) {
    const writeData = new Uint8Array(HEAP8.buffer, dataAddress, dataLength);

    const result = await this.device.controlTransferOut(
        {
          requestType: 'class',
          recipient: 'interface',
          request,
          value,
          index,
        },
        writeData);

    return result.bytesWritten;
  }

  async controlRead(request, value, index, dataAddress, dataLength) {
    const result = this.device.controlTransferIn(
        {
          requestType: 'class',
          recipient: 'interface',
          request,
          value,
          index,
        },
        dataLength);

    // Copy the result back in the HEAP.
    const srcData = new Uint8Array(
        result.data.buffer, result.data.byteOffset, result.data.byteLength);
    const dstData = new Uint8Array(HEAP8.buffer, dataAddress, dataLength);
    dstData.set(srcData);

    return result.data.byteLength;
  }
}
