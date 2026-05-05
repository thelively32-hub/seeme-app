/**
 * Expo Config Plugin para solucionar el error de compilación de iOS
 * con @react-native-firebase:
 * "include of non-modular header inside framework module"
 *
 * Este plugin inyecta la configuración necesaria en el Podfile
 * durante la fase de prebuild.
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

      let podfileContent = fs.readFileSync(podfilePath, 'utf8');

      // El código que necesitamos inyectar en post_install
      const firebaseFixCode = `
    # Firebase Fix - Allow non-modular headers
    installer.pods_project.targets.each do |target|
      target.build_configurations.each do |config|
        config.build_settings['CLANG_ALLOW_NON_MODULAR_INCLUDES_IN_FRAMEWORK_MODULES'] = 'YES'
      end
    end`;

      // Verificar si ya existe el fix
      if (podfileContent.includes('CLANG_ALLOW_NON_MODULAR_INCLUDES_IN_FRAMEWORK_MODULES')) {
        console.log('[withFirebaseFix] Fix ya aplicado, saltando...');
        return config;
      }

      // Buscar el bloque post_install existente e inyectar el código
      if (podfileContent.includes('post_install do |installer|')) {
        // Inyectar después de "post_install do |installer|"
        podfileContent = podfileContent.replace(
          /post_install do \|installer\|/,
          `post_install do |installer|${firebaseFixCode}`
        );
        console.log('[withFirebaseFix] Inyectado en post_install existente');
      } else {
        // Si no hay post_install, agregar uno al final antes del último "end"
        const postInstallBlock = `
post_install do |installer|${firebaseFixCode}
end
`;
        // Agregar antes del último end del target principal
        const lastEndIndex = podfileContent.lastIndexOf('end');
        if (lastEndIndex !== -1) {
          podfileContent = 
            podfileContent.slice(0, lastEndIndex + 3) + 
            '\n' + postInstallBlock;
        }
        console.log('[withFirebaseFix] Agregado nuevo bloque post_install');
      }

      fs.writeFileSync(podfilePath, podfileContent, 'utf8');
      console.log('[withFirebaseFix] Podfile modificado exitosamente');

      return config;
    },
  ]);
}

module.exports = withFirebaseFix;
