const express = require('express');
const mongoose = require('mongoose');
const passport = require('passport');
const session = require('express-session');
const LocalStrategy = require('passport-local').Strategy;
const flash = require('connect-flash');
const bcrypt = require('bcryptjs');
const cors = require("cors");
const axios = require("axios");
require('dotenv').config();
const MongoStore = require('connect-mongo');
const path = require('path');


const { isAuthenticated, hasRole } = require('./middlewares/authMiddleware');

const User = require('./models/User');
const authRoutes = require('./routes/authRoutes');
const donorRoutes = require("./routes/donors");
const ngoRoutes = require("./routes/ngos");
const volunteerRoutes = require("./routes/volunteers");
const donationRoutes = require('./routes/donations');
const recommendationRoutes = require('./routes/Recommend');
const adminRoutes = require("./routes/admin");


const app = express();

// ✅ FIX 1: Database Connection Handling
mongoose.connect(process.env.MONGO_URI || 'mongodb://127.0.0.1:27017/AaharSetu', {
    useNewUrlParser: true,
    useUnifiedTopology: true,
})
    .then(() => console.log("Connected to MongoDB"))
    .catch(err => console.log("MongoDB Connection Error:", err));

process.on('SIGINT', async () => {
    await mongoose.connection.close();
    console.log("MongoDB connection closed.");
    process.exit(0);
});

app.use(cors({
    origin: ["http://localhost:5173", "http://localhost:5174", "https://aaharsetufinal-1.onrender.com"], // Add frontend URLs
    credentials: true,
    methods: ["GET", "POST", "PUT", "DELETE"], // Allow necessary methods
    allowedHeaders: ["Content-Type", "Authorization"] // Ensure proper headers
}));

app.set("trust proxy", 1);


// ✅ FIX 2: Middleware Fixes
app.use(express.urlencoded({ extended: false }));
app.use(express.json({ limit: '50mb' }));

app.use(session({ 
    secret: process.env.SESSION_SECRET || 'defaultSecret', 
    resave: false, 
    saveUninitialized: false,
    store: MongoStore.create({ 
        mongoUrl: process.env.MONGO_URI, 
        collectionName: 'sessions' 
    }), // ✅ MongoDB session storage
    cookie: {
        httpOnly: true,
        secure: true,  // ✅ Ensure cookies work over HTTPS (Render is HTTPS)
        sameSite: "none",  // ✅ Required for cross-origin requests
        maxAge: 1000 * 60 * 60 * 24 * 7, // 7 days
    }
}));



// app.use(session({ 
//     secret: process.env.SESSION_SECRET || 'defaultSecret', 
//     resave: false, 
//     saveUninitialized: false,
//     cookie: {
//         httpOnly: true,
//         secure: false,  // ❌ Set `true` in production if using HTTPS
//         sameSite: "lax",  // ✅ Helps with cross-origin session issues
//         maxAge: 1000 * 60 * 60 * 24 * 7, // ✅ 7-day session persistence
//     }
// }));
app.use(passport.initialize());
app.use(passport.session());
app.use(flash());

passport.use(new LocalStrategy(
    { usernameField: 'email' },
    async (email, password, done) => {
        try {
            const user = await User.findOne({ email });
            if (!user) return done(null, false, { message: 'No user found' });

            const isMatch = await bcrypt.compare(password, user.password);
            return isMatch ? done(null, user) : done(null, false, { message: 'Incorrect password' });
        } catch (error) {
            return done(error);
        }
    }
));


// ✅ FIX 3: Passport Authentication Fixes
passport.serializeUser((user, done) => {
    console.log("Serializing User:", user); // ✅ Debug
    done(null, user._id);
});

// passport.deserializeUser(async (id, done) => {
//     try {
//         console.log("Deserializing User ID:", id); // ✅ Debug
//         const user = await User.findById(id);
//         console.log("Deserialized User:", user); // ✅ Debug
//         done(null, user);
//     } catch (error) {
//         done(error);
//     }
// });

passport.deserializeUser(async (id, done) => {
    try {
        console.log("🚀 Deserializing User ID:", id);
        if (!id) {
            console.log("⚠️ No user ID found in session!");
            return done(null, false);
        }

        const user = await User.findById(id);
        if (!user) {
            console.log("❌ User not found in DB for ID:", id);
            return done(null, false);
        }

        console.log("✅ Successfully deserialized User:", user);
        done(null, user);
    } catch (error) {
        console.error("🔥 Error in deserialization:", error);
        done(error);
    }
});


// passport.serializeUser((user, done) => done(null, user.id));
// passport.deserializeUser(async (id, done) => {
//     try {
//         const user = await User.findById(id);
//         done(null, user);
//     } catch (error) {
//         done(error);
//     }
// });

app.use((req, res, next) => {
    console.log("Session Data:", req.session); // ✅ Log session data
    console.log("User from Session:", req.user); // ✅ Log user data
    next();
});


// ✅ FIX 4: Route Fixes
app.use("/api/auth", authRoutes);
app.use("/api/donors", isAuthenticated, hasRole(['donor']), donorRoutes);
app.use("/api/ngos", isAuthenticated, hasRole(['ngo', 'admin']), ngoRoutes);
app.use("/api/volunteers", isAuthenticated, hasRole(['volunteer', 'admin']), volunteerRoutes);
app.use('/donations', isAuthenticated, hasRole(['donor']), donationRoutes);
app.use('/', recommendationRoutes);
app.use('/admin', adminRoutes);

app.use((req, res, next) => {
    console.log("🔍 Session Data:", req.session);
    console.log("👤 User from Session:", req.user);
    next();
});

// ✅ FIX 5: API Check
app.get("/", (req, res) => {
    res.send("API is running...");
});

app.use(express.static(path.join(__dirname, '..', 'frontend', 'build')));

app.get('*', (req, res) => {
  res.sendFile(path.join(__dirname, '..', 'frontend', 'build', 'index.html'));
});

// ✅ FIX 6: Port Fixes
const PORT = process.env.PORT || 5000;
app.listen(PORT, () => console.log(`Server running on port ${PORT}`));





// const express = require('express');
// const mongoose = require('mongoose');
// const passport = require('passport');
// const session = require('express-session');
// const LocalStrategy = require('passport-local').Strategy;
// const flash = require('connect-flash');
// const bcrypt = require('bcryptjs');
// const cors = require("cors");
// const axios = require("axios");
// require('dotenv').config();

// const User = require('./models/User');
// const authRoutes = require('./routes/authRoutes');
// const donorRoutes = require("./routes/donors");
// const ngoRoutes = require("./routes/ngos");
// const volunteerRoutes = require("./routes/volunteers");
// const donationRoutes = require('./routes/donations');
// const recommendationRoutes = require('./routes/recommendations');

// const app = express();

// // Database Connection
// mongoose.connect('mongodb://127.0.0.1:27017/AaharSetu', {
//     useNewUrlParser: true,
//     useUnifiedTopology: true,
// })
//     .then(() => console.log("Connected to MongoDB"))
//     .catch(err => console.log("MongoDB Connection Error:", err));

// // Middleware
// app.use(express.urlencoded({ extended: false }));
// app.use(express.json({limit: '50mb'}));
// app.use(cors({ origin: ["http://localhost:5173", "http://localhost:5174"], credentials: true }));
// app.use(session({ secret: 'secretKey', resave: false, saveUninitialized: false }));
// app.use(passport.initialize());
// app.use(passport.session());
// app.use(flash());

// // Passport Configuration
// passport.use(new LocalStrategy(
//     { usernameField: 'email' },
//     async (email, password, done) => {
//         try {
//             const user = await User.findOne({ email });
//             if (!user) return done(null, false, { message: 'No user found' });

//             const isMatch = await bcrypt.compare(password, user.password);
//             return isMatch ? done(null, user) : done(null, false, { message: 'Incorrect password' });
//         } catch (error) {
//             return done(error);
//         }
//     }
// ));

// passport.serializeUser((user, done) => done(null, user.id));
// passport.deserializeUser(async (id, done) => {
//     try {
//         const user = await User.findById(id);
//         done(null, user);
//     } catch (error) {
//         done(error);
//     }
// });

// // Routes
// app.use("/api/auth", authRoutes);
// app.use("/api/donors", donorRoutes);
// app.use("/api/ngos", ngoRoutes);
// app.use("/api/volunteers", volunteerRoutes);
// app.use('/donations', donationRoutes);
// app.use('/api/recommendations', recommendationRoutes);

// // API Check
// app.get("/", (req, res) => {
//     res.send("API is running...");
// });

// // Start Server
// const PORT = process.env.PORT ||5000;
// app.listen(PORT, () => console.log(`Server running on port ${PORT}`));


// const express = require('express');
// const mongoose = require('mongoose');
// const passport = require('passport');
// const session = require('express-session');
// const LocalStrategy = require('passport-local').Strategy;
// const flash = require('connect-flash');
// const bcrypt = require('bcryptjs');
// const path = require('path');
// const User = require('./models/Donor');
// const authRoutes = require('./routes/authRouter');
// require('dotenv').config();
// const cors = require("cors");

// const app = express();

// main().then(() => {
//     console.log("successful");
// }).catch((err) => {
//     console.log(err);
// });

// // Database Connection
// async function main() {
//     await mongoose.connect('mongodb://127.0.0.1:27017/AaharSetu');
//     console.log("Connected to MongoDB");
// }


// // Middleware
// app.use(express.urlencoded({ extended: false }));
// app.use(express.static('public'));
// app.use(session({ secret: 'secretKey', resave: false, saveUninitialized: false }));
// app.use(passport.initialize());
// app.use(passport.session());
// app.use(flash());
// app.use("/donors", require("./routes/donors"));
// app.use("/ngos", require("./routes/ngos"));
// app.use("/volunteers", require("./routes/volunteers"));
// app.use(cors({ origin: "http://localhost:5173", credentials: true }));

// // Passport Configuration
// passport.use(new LocalStrategy(
//     { usernameField: 'email' },
//     async (email, password, done) => {
//         const user = await User.findOne({ email });
//         if (!user) return done(null, false, { message: 'No user found' });
//         const isMatch = await bcrypt.compare(password, user.password);
//         return isMatch ? done(null, user) : done(null, false, { message: 'Incorrect password' });
//     }
// ));

// passport.serializeUser((user, done) => done(null, user.id));
// passport.deserializeUser(async (id, done) => {
//     const user = await User.findById(id);
//     done(null, user);
// });

// // View Engine
// app.set('view engine', 'ejs');
// app.set('views', path.join(__dirname, 'views'));

// app.get('/', (req, res) => {
//     res.render('home.ejs');  // Make sure 'home.ejs' exists in the 'views' folder
// });
// // Routes
// app.use(authRoutes);

// // Start Server
// const PORT = process.env.PORT || 5000;
// app.listen(5000, () => console.log('Server running on port 5000'));