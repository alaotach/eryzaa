import mongoose from 'mongoose';

const MONGODB_URI = 'mongodb+srv://koraon1234:koraon1234@kriyan.fnxb1.mongodb.net/?retryWrites=true&w=majority&appName=Kriyan';

class Database {
  private static instance: Database;
  private isConnected: boolean = false;

  private constructor() {}

  public static getInstance(): Database {
    if (!Database.instance) {
      Database.instance = new Database();
    }
    return Database.instance;
  }

  public async connect(): Promise<void> {
    if (this.isConnected) {
      console.log('Already connected to MongoDB');
      return;
    }

    try {
      await mongoose.connect(MONGODB_URI, {
        dbName: 'eryzaa_marketplace'
      });
      
      this.isConnected = true;
      console.log('Connected to MongoDB successfully');

      mongoose.connection.on('disconnected', () => {
        this.isConnected = false;
        console.log('MongoDB disconnected');
      });

      mongoose.connection.on('error', (error) => {
        console.error('MongoDB connection error:', error);
        this.isConnected = false;
      });

    } catch (error) {
      console.error('Failed to connect to MongoDB:', error);
      throw error;
    }
  }

  public async disconnect(): Promise<void> {
    if (!this.isConnected) {
      return;
    }

    try {
      await mongoose.disconnect();
      this.isConnected = false;
      console.log('Disconnected from MongoDB');
    } catch (error) {
      console.error('Error disconnecting from MongoDB:', error);
      throw error;
    }
  }

  public getConnectionStatus(): boolean {
    return this.isConnected;
  }
}

export default Database.getInstance();
