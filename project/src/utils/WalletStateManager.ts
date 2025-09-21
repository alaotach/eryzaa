// Wallet state management utility
class WalletStateManager {
  private static instance: WalletStateManager;
  private walletData: {
    isConnected: boolean;
    address: string;
    chainId: number;
    connectedAt: number;
  } | null = null;

  private constructor() {
    this.loadFromStorage();
  }

  static getInstance(): WalletStateManager {
    if (!WalletStateManager.instance) {
      WalletStateManager.instance = new WalletStateManager();
    }
    return WalletStateManager.instance;
  }

  private loadFromStorage() {
    try {
      const stored = localStorage.getItem('eryzaa_wallet_state');
      if (stored) {
        const parsed = JSON.parse(stored);
        // Check if connection is recent (within 24 hours)
        const isRecent = (Date.now() - parsed.connectedAt) < 24 * 60 * 60 * 1000;
        if (isRecent) {
          this.walletData = parsed;
        } else {
          this.clearState();
        }
      }
    } catch (error) {
      console.error('Error loading wallet state:', error);
      this.clearState();
    }
  }

  private saveToStorage() {
    try {
      if (this.walletData) {
        localStorage.setItem('eryzaa_wallet_state', JSON.stringify(this.walletData));
        // Also save to sessionStorage for faster access
        sessionStorage.setItem('eryzaa_wallet_state', JSON.stringify(this.walletData));
      }
    } catch (error) {
      console.error('Error saving wallet state:', error);
    }
  }

  public setConnected(address: string, chainId: number) {
    this.walletData = {
      isConnected: true,
      address: address.toLowerCase(),
      chainId,
      connectedAt: Date.now()
    };
    this.saveToStorage();
    console.log('Wallet state saved:', this.walletData);
  }

  public setDisconnected() {
    this.walletData = null;
    this.clearState();
  }

  public getState() {
    return this.walletData;
  }

  public isConnected(): boolean {
    return this.walletData?.isConnected || false;
  }

  public getAddress(): string {
    return this.walletData?.address || '';
  }

  private clearState() {
    this.walletData = null;
    localStorage.removeItem('eryzaa_wallet_state');
    sessionStorage.removeItem('eryzaa_wallet_state');
    // Also clear old format keys
    localStorage.removeItem('web3Connected');
    localStorage.removeItem('userAddress');
    sessionStorage.removeItem('web3Connected');
    sessionStorage.removeItem('userAddress');
    sessionStorage.removeItem('walletConnectedAt');
  }

  public async validateConnection(): Promise<boolean> {
    if (!this.walletData || !window.ethereum) {
      return false;
    }

    try {
      const accounts = await window.ethereum.request({ method: 'eth_accounts' });
      const currentChainId = await window.ethereum.request({ method: 'eth_chainId' });
      
      const isValidAccount = accounts.length > 0 && 
        accounts[0].toLowerCase() === this.walletData.address.toLowerCase();
      
      const isValidChain = parseInt(currentChainId, 16) === this.walletData.chainId;

      if (!isValidAccount || !isValidChain) {
        console.log('Wallet validation failed - clearing state');
        this.clearState();
        return false;
      }

      // Update timestamp on successful validation
      this.walletData.connectedAt = Date.now();
      this.saveToStorage();
      return true;
    } catch (error) {
      console.error('Error validating wallet connection:', error);
      this.clearState();
      return false;
    }
  }
}

export default WalletStateManager;
