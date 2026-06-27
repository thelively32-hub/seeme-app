/**
 * Expo Config Plugin - Firebase iOS Build Fix
 * Soluciona: "include of non-modular header inside framework module 'RNFBApp'"
 * 
 * Este plugin inyecta la configuración necesaria en el Podfile usando
 * el método oficial de Expo (mergeContents).
 */

const { withDangerousMod } = require('@expo/config-plugins');
const { mergeContents } = require('@expo/config-plugins/build/utils/generateCode');
const fs = require('fs');
const path = require('path');

const FIREBASE_FIX_TAG = 'react-native-firebase-fix';

const firebaseFixCode = `
  # ===== FIREBASE NON-MODULAR HEADERS FIX =====
  # Fix for: include of non-modular header inside framework module 'RNFBApp'
  # Reference: https://github.com/invertase/react-native-firebase/issues/8657
  installer.pods_project.targets.each do |target|
    target.build_configurations.each do |config|
      config.build_settings['CLANG_ALLOW_NON_MODULAR_INCLUDES_IN_FRAMEWORK_MODULES'] = 'YES'
      config.build_settings['SWIFT_STRICT_CONCURRENCY'] = 'minimal'
      config.build_settings['SWIFT_TREAT_WARNINGS_AS_ERRORS'] = 'NO'
    end
  end
  
  installer.pods_project.build_configuration_list.build_configurations.each do |configuration|
    configuration.build_settings['CLANG_ALLOW_NON_MODULAR_INCLUDES_IN_FRAMEWORK_MODULES'] = 'YES'
    configuration.build_settings['SWIFT_STRICT_CONCURRENCY'] = 'minimal'
    configuration.build_settings['SWIFT_TREAT_WARNINGS_AS_ERRORS'] = 'NO'
  end
  # ===== END FIREBASE FIX =====
`;

function withFirebaseFix(config) {
  return withDangerousMod(config, [
    'ios',
    async (config) => {
      const podfilePath = path.join(
        config.modRequest.platformProjectRoot,
        'Podfile'
      );

      console.log('[withFirebaseFix] 📍 Reading Podfile:', podfilePath);

      if (!fs.existsSync(podfilePath)) {
        console.log('[withFirebaseFix] ⚠️ Podfile not found');
        return config;
      }

      let podfileContent = fs.readFileSync(podfilePath, 'utf8');

      // Usar mergeContents para inyectar de forma segura
      try {
        const result = mergeContents({
          tag: FIREBASE_FIX_TAG,
          src: podfileContent,
          newSrc: firebaseFixCode,
          anchor: /post_install\s+do\s+\|installer\|/,
          offset: 1, // Insertar después del anchor
          comment: '#',
        });

        if (result.didMerge) {
          fs.writeFileSync(podfilePath, result.contents, 'utf8');
          console.log('[withFirebaseFix] ✅ Fix inyectado exitosamente');
        } else if (result.didClear) {
          console.log('[withFirebaseFix] ℹ️ Fix existente fue actualizado');
        } else {
          // Fallback: buscar e inyectar manualmente
          console.log('[withFirebaseFix] ⚠️ mergeContents no encontró anchor, intentando fallback...');
          
          if (podfileContent.includes('post_install do |installer|')) {
            podfileContent = podfileContent.replace(
              /(post_install\s+do\s+\|installer\|)/,
              `$1\n${firebaseFixCode}`
            );
            fs.writeFileSync(podfilePath, podfileContent, 'utf8');
            console.log('[withFirebaseFix] ✅ Fix inyectado via fallback');
          } else {
            console.log('[withFirebaseFix] ❌ No se encontró post_install block');
          }
        }
      } catch (error) {
        console.log('[withFirebaseFix] ⚠️ Error con mergeContents, usando fallback:', error.message);
        
        // Fallback directo
        if (!podfileContent.includes('CLANG_ALLOW_NON_MODULAR_INCLUDES_IN_FRAMEWORK_MODULES')) {
          if (podfileContent.includes('post_install do |installer|')) {
            podfileContent = podfileContent.replace(
              /(post_install\s+do\s+\|installer\|)/,
              `$1\n${firebaseFixCode}`
            );
          } else {
            // Agregar post_install completo al final
            podfileContent += `\npost_install do |installer|\n${firebaseFixCode}\nend\n`;
          }
          fs.writeFileSync(podfilePath, podfileContent, 'utf8');
          console.log('[withFirebaseFix] ✅ Fix aplicado via fallback directo');
        }
      }

      // Verificación final
      const finalContent = fs.readFileSync(podfilePath, 'utf8');
      if (finalContent.includes('CLANG_ALLOW_NON_MODULAR_INCLUDES_IN_FRAMEWORK_MODULES')) {
        console.log('[withFirebaseFix] ✅ Verificación: Fix presente en Podfile');
      } else {
        console.log('[withFirebaseFix] ❌ Verificación: Fix NO encontrado en Podfile');
      }

      return config;
    },
  ]);
}

module.exports = withFirebaseFix;
