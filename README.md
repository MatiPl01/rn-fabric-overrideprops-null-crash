# RN 0.86 Android Fabric crash: `SurfaceMountingManager.overridePropsReadableMap` AssertionError

Minimal reproduction of a **React Native 0.86 Android (Fabric / New Architecture)** crash:

```
java.lang.AssertionError: Assertion failed
  at com.facebook.react.fabric.mounting.SurfaceMountingManager$Companion.overridePropsReadableMap(SurfaceMountingManager.kt:1331)
  at com.facebook.react.fabric.mounting.SurfaceMountingManager$Companion.access$overridePropsReadableMap(SurfaceMountingManager.kt:1294)
  at com.facebook.react.fabric.mounting.SurfaceMountingManager.updateProps(SurfaceMountingManager.kt:675)
  at com.facebook.react.fabric.mounting.SurfaceMountingManager.updateProps(SurfaceMountingManager.kt:645)
  at com.facebook.react.fabric.mounting.mountitems.IntBufferBatchMountItem.execute(IntBufferBatchMountItem.kt:127)
  at com.facebook.react.fabric.mounting.MountItemDispatcher.executeOrEnqueue(MountItemDispatcher.kt:379)
```

> This project uses **no `react-native-reanimated`** (it is not a dependency, see `package.json`).
> The crash is in React Native core, which is why it surfaced in
> [software-mansion/react-native-reanimated#9785](https://github.com/software-mansion/react-native-reanimated/issues/9785)
> but is not caused by Reanimated.

Line `1331` is the `transform` assert; the analogous `opacity` assert is line `1349` (the variant
in #9785). Both are the same code path.

## Steps to reproduce

1. `npm install` (or `yarn`)
2. Run a **debug** build on an Android device/emulator with the New Architecture (default in 0.86):
   ```
   npm run android
   ```
3. Tap **"1. Start native transform"** - runs a native-driver `Animated` transform on the box.
4. Tap **"2. Clear transform"** - removes the `transform` style prop from the same view.
5. The app crashes with the `AssertionError` above.

The entire repro is in [`App.tsx`](./App.tsx): a single `Animated.View` whose `transform` is driven
by `useNativeDriver: true`, plus a button that removes the `transform` prop.

## Root cause

RN 0.86 enables the feature flag `overrideBySynchronousMountPropsAtMountingAndroid` by default. In
that path:

1. Native Animated (`useNativeDriver: true`) synchronously stores a `transform` / `opacity` override
   for the view tag (`tagToSynchronousMountProps`).
2. Removing the prop makes a later **regular** Fabric commit deliver `transform: null` /
   `opacity: null` for the same tag.
3. `overridePropsReadableMap` re-applies the stored override and asserts the committed value is an
   `Array` / `Number`. The value is `null`, so the assertion fails and the app crashes.

Note: the crash only surfaces on builds with JVM assertions enabled (standard debuggable RN debug
builds). On a release build the assertion is a no-op and the stored override is silently applied.

## Fix

Fixed upstream in [facebook/react-native#56913](https://github.com/facebook/react-native/pull/56913),
which relaxes the assert to also accept `ReadableType.Null`. As of this writing it is only on `main`
- not in `0.86.0` and not on the `0.86-stable` branch, so no 0.86 release contains it yet.

Until it ships, the practical workaround is to avoid the native-driver `transform` / `opacity` that
later gets cleared (for React Navigation native-stack, `animation: 'none'` on Android).

## Environment

- React Native `0.86.0`, New Architecture (Fabric), Hermes
- Android (reproduced on an emulator, API 36)
- No `react-native-reanimated`, no `react-native-worklets`
