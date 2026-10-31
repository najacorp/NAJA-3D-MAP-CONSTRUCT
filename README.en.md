<!-- coderabbit-ai-generated:v1 -->

# NAJA 3D Map Construct — foundation

<!-- coderabbit-ai-generated:v1 -->

<!-- coderabbit-ai-generated-section:v1:5a2b0b1a79e6b09caf34dd28915b0135f29e4c164dc1fb2ef39338263f882789 -->

<!-- coderabbit-ai-generated:v1 -->

<!-- coderabbit-ai-generated-section:v1:f53f61df1da0322b6cae231038ae6145ff56911544952af1390b53f83d0b6169 -->

<!-- coderabbit-ai-generated:v1 -->

<!-- coderabbit-ai-generated-section:v1:04411e437e8e01ddde7d7191a868dc1174f8e50b75a331b13182e8c84e0d26df -->

This development version includes the library, map editing, inspector, projects and GLB export. Full v1.0 validation is still outstanding.

<!-- /coderabbit-ai-generated:v1 -->

<!-- /coderabbit-ai-generated:v1 -->

<!-- /coderabbit-ai-generated:v1 -->

## Run

Requirements: Node.js 24, npm and a graphical Linux environment.

```sh
npm ci
npm run dev
```

<!-- coderabbit-ai-generated:v1 -->

<!-- coderabbit-ai-generated-section:v1:4b1b1085d2d6408ce89d4ef1ca3fdc4d7173052160a6d6efb01ad489c7587a62 -->

Use the top selector to change language and the adjacent button to change theme. Run `npm run dev:web` for the browser interface.

In the viewport, right drag orbits, middle drag or Space + drag pans, the wheel zooms and F frames the origin. WASD and the joystick move the camera. The lower right buttons control zoom and framing. <!-- coderabbit-ai-generated:v1 -->

<!-- coderabbit-ai-generated-section:v1:7401327119794443152c6e1f1a73a84c7f9fd2d57effac4b9eb2c84450576924 -->

Drag an asset from the library to the ground; click to select and Shift-click for multiple selection. Use W/E/R to move/rotate/scale one selected piece; Ctrl+D duplicates, Delete removes, Ctrl+Z undoes and Ctrl+Shift+Z redoes. W moves the camera when no piece is selected.

<!-- /coderabbit-ai-generated:v1 -->

In Electron, the rendering selector saves the choice and restarts the app. Auto allows SwiftShader fallback; CPU requests SwiftShader; GPU requests hardware rendering, subject to driver support. The badge shows the detected renderer or unknown if unavailable. Chromium considers SwiftShader WebGL an option with reduced security; use only trusted content. See [Chromium documentation](https://chromium.googlesource.com/chromium/src/+/main/docs/gpu/swiftshader.md).

<!-- /coderabbit-ai-generated:v1 -->

<!-- coderabbit-ai-generated:v1 -->

<!-- coderabbit-ai-generated-section:v1:7078136a18664ebbb24d40c7cace4151aca2d449767927e32df09605c08eef92 -->

## Library

Click Import and choose a folder, or drop a folder onto the window. GLB and OBJ files are found recursively; filter them using the folder tree and search. Models and thumbnails are stored locally in IndexedDB. Reimporting the same path replaces the cached version. Individual file errors appear in the library. OBJ uses a default material without MTL loading; GLB resources must be embedded. Without WebGL, models can be imported without thumbnails.

<!-- coderabbit-ai-generated:v1 -->

<!-- coderabbit-ai-generated-section:v1:7129424c9c93742a28b528f6a5a338d60e079e30b18b14f84c2e06389ad2bae1 -->

## Projects and export

Save a `.naja` map and reopen it with Open. The project embeds assets and edited textures, transforms, materials, collision and snap settings; a copy of recent projects is stored locally. Reimporting the same filename replaces its recent copy. Downloads use the browser or Electron download location.

The inspector edits position, rotation, scale, dimensions, color, emission, metalness, roughness and opacity. Textures can be applied to one piece or existing instances of the asset. The Godot profile includes box, convex or mesh collision nodes; Neutral exports visual geometry only. The GLB embeds textures.

## Known limitations

<!-- coderabbit-ai-generated:v1 -->

<!-- coderabbit-ai-generated-section:v1:4b927dd5a33f92dd7fbea7c8c75fac489557049264b052f261edff577fd1786f -->

- In the SwiftShader synthetic test, <!-- coderabbit-ai-generated:v1 -->

<!-- coderabbit-ai-generated-section:v1:0e8dd5964b2af871d9e5997593b87d42ab52f457369e5a00449ab97be91da410 -->

200 repeated cubes ran at about 39 FPS and 1,000 opened in under a second, at about 31 FPS

<!-- /coderabbit-ai-generated:v1 -->. Results depend on hardware and model complexity; instancing groups identical opaque static meshes.

<!-- /coderabbit-ai-generated:v1 -->
- Full Blender, Unity and target distribution compatibility testing remains outstanding. Cloud preview in this environment does not provide WebGL.
<!-- coderabbit-ai-generated:v1 -->

<!-- coderabbit-ai-generated-section:v1:7791733b6cea9fc81af36d23f60429b1120680c5a0928fa00d4362521f7c56f2 -->

- <!-- coderabbit-ai-generated:v1 -->

<!-- coderabbit-ai-generated-section:v1:c31c8ed8dde6a842a0d151e7418435b814b067785f8d54147ddcc13a6c1c6a1e -->

Multiple selection supports group transforms, duplication and deletion; group scaling is proportional to preserve piece transforms, and the inspector edits one piece at a time.

<!-- /coderabbit-ai-generated:v1 -->

<!-- /coderabbit-ai-generated:v1 --> <!-- coderabbit-ai-generated:v1 -->

<!-- coderabbit-ai-generated-section:v1:bb15c7176a06f333e611afb4e81763b1a03bc48bbe1e1d983310d7773c66127c -->

Drag X/Y/Z labels to change values; Shift uses a finer step and Alt a coarser step.

<!-- /coderabbit-ai-generated:v1 -->
- The AppImage is experimental and is not a validated 1.0 release.

## Verify

<!-- /coderabbit-ai-generated:v1 -->

<!-- /coderabbit-ai-generated:v1 -->

```sh
npm run lint
<!-- coderabbit-ai-generated:v1 -->

<!-- coderabbit-ai-generated-section:v1:e5ebb2a993608787a74393abdaf9c828c534163fa85b6fe1fe859ea917b8cc15 -->

npm test
npm run test:e2e  # requires xvfb-run on Linux
npm run build

<!-- /coderabbit-ai-generated:v1 -->
```

CI runs these commands. The preliminary AppImage configuration can be invoked with `npm run dist`; it is not the final release and has not been validated on the target distributions. On systems without FUSE 2, AppImages can use `--appimage-extract-and-run`.

GPL-3.0-only; see LICENSE and THIRD_PARTY_LICENSES.md.
