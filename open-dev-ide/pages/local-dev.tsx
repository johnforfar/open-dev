import { AutomatedVMSetup } from '../components/automated-vm-setup';

export default function LocalDevPage() {
  return (
    <div className="container mx-auto py-8">
      <div className="mb-8">
        <h1 className="text-3xl font-bold mb-2">🚀 OpenDev Local Development</h1>
        <p className="text-muted-foreground">
          Automated VM setup for local NixOS development with xnode-manager
        </p>
      </div>
      
      <AutomatedVMSetup />
      
      <div className="mt-8 p-6 bg-muted/50 rounded-lg">
        <h2 className="text-xl font-semibold mb-4">🎯 What This Does</h2>
        <div className="grid md:grid-cols-2 gap-6">
          <div>
            <h3 className="font-medium mb-2">🔄 Automated Process</h3>
            <ul className="text-sm space-y-1 text-muted-foreground">
              <li>• Creates 64GB QEMU VM</li>
              <li>• Installs Ubuntu Server ARM64</li>
              <li>• Converts to NixOS automatically</li>
              <li>• Configures xnode-manager service</li>
              <li>• Sets up HTTPS and authentication</li>
            </ul>
          </div>
          <div>
            <h3 className="font-medium mb-2">🚀 Developer Experience</h3>
            <ul className="text-sm space-y-1 text-muted-foreground">
              <li>• One-click setup</li>
              <li>• Real-time progress monitoring</li>
              <li>• Automatic frontend integration</li>
              <li>• Deploy apps immediately</li>
              <li>• Local development environment</li>
            </ul>
          </div>
        </div>
      </div>
    </div>
  );
}
