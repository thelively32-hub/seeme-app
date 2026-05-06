/**
 * Expo Config Plugin para solucionar el error de compilación de iOS
 * con @react-native-firebase:
 * "include of non-modular header inside framework module"
 *
 * Solución basada en: https://github.com/invertase/react-native-firebase/issues/8657
 */

const { withDangerousMod } = require('@expo/config-plugins');
const fs = require('fs');
const path = require('path');

function withFirebaseFix(config) {
  return withDangerousMod(config, [
    'ios',
    async (config) => {
      const podfilePath = path.join(
        config.modRequest.platformProjectRoot,
        'Podfile'
      );

      console.log('[withFirebaseFix] 📍 Podfile path:', podfilePath);

      if (!fs.existsSync(podfilePath)) {
        console.log('[withFirebaseFix] ⚠️ Podfile not found, skipping...');
        return config;
      }

      let podfileContent = fs.readFileSync(podfilePath, 'utf8');

      // Verificar si ya existe el fix
      if (podfileContent.includes('CLANG_ALLOW_NON_MODULAR_INCLUDES_IN_FRAMEWORK_MODULES')) {
        console.log('[withFirebaseFix] ✅ Fix ya aplicado');
        return config;
      }

      // Código de fix específico para Firebase pods
      const firebaseFixCode = `
    # ===== FIREBASE FIX START =====
    # Fix for: include of non-modular header inside framework module 'RNFBApp'
    # Reference: https://github.com/invertase/react-native-firebase/issues/8657
    installer.pods_project.targets.each do |target|
      if target.name.start_with?('RNFB') || target.name == 'Firebase' || target.name.start_with?('Firebase')
        target.build_configurations.each do |config|
          config.build_settings['CLANG_ALLOW_NON_MODULAR_INCLUDES_IN_FRAMEWORK_MODULES'] = 'YES'
          other_cflags = config.build_settings['OTHER_CFLAGS'] || ['$(inherited)']
          unless other_cflags.include?('-Wno-non-modular-include-in-framework-module')
            config.build_settings['OTHER_CFLAGS'] = other_cflags + ['-Wno-non-modular-include-in-framework-module']
          end
        end
      end
    end
    
    # Also apply to all pods as fallback
    installer.pods_project.build_configuration_list.build_configurations.each do |configuration|
      configuration.build_settings['CLANG_ALLOW_NON_MODULAR_INCLUDES_IN_FRAMEWORK_MODULES'] = 'YES'
    end
    # ===== FIREBASE FIX END =====`;

      // Buscar diferentes patrones de post_install
      const patterns = [
        // Patrón de Expo: react_native_post_install
        {
          regex: /(react_native_post_install\s*\([^)]*\))/,
          replacement: `$1\n${firebaseFixCode}`
        },
        // Patrón estándar: post_install do |installer|
        {
          regex: /(post_install\s+do\s+\|installer\|)/,
          replacement: `$1\n${firebaseFixCode}`
        }
      ];

      let applied = false;
      for (const pattern of patterns) {
        if (pattern.regex.test(podfileContent)) {
          podfileContent = podfileContent.replace(pattern.regex, pattern.replacement);
          console.log('[withFirebaseFix] ✅ Fix inyectado usando patrón:', pattern.regex.toString());
          applied = true;
          break;
        }
      }

      // Si no encontramos ningún patrón, agregar post_install completo
      if (!applied) {
        console.log('[withFirebaseFix] ⚠️ No se encontró post_install, agregando nuevo bloque');
        const newPostInstall = `
post_install do |installer|
${firebaseFixCode}
end
`;
        podfileContent += '\n' + newPostInstall;
      }

      fs.writeFileSync(podfilePath, podfileContent, 'utf8');
      
      // Verificar que se aplicó
      const verifyContent = fs.readFileSync(podfilePath, 'utf8');
      if (verifyContent.includes('CLANG_ALLOW_NON_MODULAR_INCLUDES_IN_FRAMEWORK_MODULES')) {
        console.log('[withFirebaseFix] ✅ Fix verificado en Podfile');
      } else {
        console.log('[withFirebaseFix] ❌ ERROR: Fix no se aplicó correctamente');
      }

      return config;
    },
  ]);
}

module.exports = withFirebaseFix;
