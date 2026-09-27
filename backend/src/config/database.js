import mongoose from 'mongoose';
export const connectDatabase = async () => {
    try {
        const mongoURI = process.env.MONGODB_URI || '';
        if (!mongoURI) {
            throw new Error('MONGODB_URI is not defined in the environment variables');
        }
        await mongoose.connect(mongoURI);
        console.log('Connected to MongoDB successfully');
    }
    catch (error) {
        console.error('Error connecting to MongoDB:', error);
        process.exit(1); // Exit the process with an error code
    }
};
//# sourceMappingURL=database.js.map