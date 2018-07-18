# libgphoto2 in WASM #

This demo project uses libgphoto2 compiled to WebAssembly to connect to digital
cameras connected via WebUSB. It contains two demos, a file preview and
live preview. The file preview demo reads the image files stored in the camera's
memory and renders them on screen. The live preview demo streams the image from
the camera's lens and renders it on the screen.

** This demo is not tested on all cameras. Use at your own risk. **

I modified this project to perform the I/O and processing of the data from the
camera on a worker thread as well. There is a radio button that is used to
select the context in which to perform these operations. The purpose of this
modification to be able to measure the impact of removing these operations from
the main thread of the browser.

# Instructions #

1. Connect a digital camera via USB.
2. Make sure that the device is not mounted. On linux, use the `lsof` command to
   check the processes that are using the device.
3. Start a local HTTP server. With Python, you can use `python -m
   SimpleHTTPServer` inside the project directory.
4. Run Chrome with the `--enable-experimental-web-platform-features` flag and
   navigate to the page.
5. Click on the "Connect to Camera" button to allow the page to connect to the
   camera.
6. Select one of the demos to run.

If the application does not work with the dedicated worker, use the latest build
of Chromium from the source code. The demo might not also work with all cameras.
