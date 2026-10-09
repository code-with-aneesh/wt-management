# Weight Management Application

A comprehensive SvelteKit-based web application for tracking weight, height, BMI, gym attendance, and more—with interactive visualizations, AI-powered chatbot, community forum, and secure cloud storage.

## ✨ Key Features

- 🔒 **Secure Authentication** – Google login via Firebase
- 📊 **Data Tracking** – Record weight, height, age, waist, and activity level with input validation
- ⚖️ **BMI & BMR Insights** – Automatic BMI, BMR, and daily calorie calculation with health categorization
- 🎯 **Personalized Goals** – Healthy weight range suggestions based on height
- 📈 **Interactive Visualizations** – Beautiful charts for weight and gym progress using Chart.js
- 🏆 **Leaderboard** – Compare user progress, gym attendance, and weight loss
- 🏋️ **Gym Calendar** – Interactive calendar for tracking gym attendance
- 🤖 **AI Chatbot (FitBot)** – Ask health, fitness, and nutrition questions
- �️ **Community Forum** – Post, reply, upvote/downvote, and pin messages; admin controls
- 📝 **Blog** – Markdown-based blog posts with live preview and authentication
- 🔄 **Weight History** – Paginated, sortable weight history with edit/delete options
- 🌙 **Dark Mode & Custom Themes** – Tailwind CSS with custom theming and dark mode
- �📱 **Fully Responsive** – Optimized for all device sizes

## 🚀 Quick Start

git clone https://github.com/code-with-aneesh/wt-management.git
### Prerequisites

- Node.js v16+
- Firebase account
- Modern web browser

### Installation

1. Clone the repository:
   ```bash
   git clone https://github.com/code-with-aneesh/wt-management.git
   cd wt-management
   ```
2. Install dependencies:
   ```bash
   npm install
   ```
3. Set up Firebase configuration:
   - Create a Firebase project at [firebase.google.com](https://firebase.google.com)
   - Create a `.env` file in the root directory:
     ```env
     VITE_API_KEY=your_firebase_api_key
     VITE_AUTH_DOMAIN=your_project.firebaseapp.com
     VITE_PROJECT_ID=your_project_id
     VITE_STORAGE_BUCKET=your_bucket.appspot.com
     VITE_MESSAGING_SENDER_ID=your_sender_id
     VITE_APP_ID=your_app_id
     CLOUDINARY_CLOUD_NAME=your_cloudinary_cloud_name
     CLOUDINARY_API_KEY=your_cloudinary_api_key
     CLOUDINARY_API_SECRET=your_cloudinary_api_secret
     ```
4. (Optional) For Vercel deployment, add `vercel.json` and set environment variables in Vercel dashboard.
5. Run the development server:
   ```bash
   npm run dev
   ```
6. Open your browser to: `http://localhost:5173`

## 🛠️ Building for Production

```bash
npm run build
npm run preview
```

## 🧰 Technology Stack

| Component        | Technology           |
|------------------|---------------------|
| Framework        | SvelteKit           |
| Routing          | SvelteKit File-based|
| Authentication   | Firebase Auth       |
| Database         | Firestore           |
| Charts           | Chart.js            |
| Styling          | Tailwind CSS, Flowbite Svelte |
| State Management | Svelte Stores       |
| Markdown         | marked, DOMPurify   |
| UI Components    | Flowbite Svelte     |

## 📅 Future Roadmap

### Planned Enhancements

- [ ] Multi-provider authentication (Facebook, Apple, Email)
- [ ] Advanced body metrics (body fat, muscle mass)
- [ ] Customizable reminders and notifications
- [ ] Enhanced chart features (zoom, export, annotations)
- [ ] Mobile app (via Capacitor or similar)
- [ ] AI-powered health recommendations
- [ ] Forum moderation tools
- [ ] Blog post scheduling and rich media

### Known Issues

- [ ] Chart loading performance on low-end devices
- [ ] Timezone handling for date tracking

## 🤝 Contributing


## 🗂️ Main Routes & Pages

- `/dashboard` – Health dashboard with weight, gym, and BMI stats
- `/leaderboard` – Compare user progress and gym attendance
- `/profile` – Community forum for discussions and replies
- `/blog` – Markdown-based blog posts
- `/chatbot` – AI-powered FitBot for health queries
- `/bmi` – BMI, BMR, and calorie calculator
- `/gym` – Interactive gym calendar
- `/input` – Multi-section health data input form
- `/images` – Upload, tag, filter, and browse personal images with timestamps using Cloudinary and Firestore metadata
- `/updateweights` – Weight history management
- `/about` – App info and team details

### Cloudinary image storage

Images are uploaded through the SvelteKit server endpoint and stored in Cloudinary. Firestore stores the Cloudinary URLs and image metadata, while older Firestore Base64 images remain readable in the gallery for compatibility.

Keep `CLOUDINARY_API_SECRET` server-only: do not prefix it with `VITE_`, commit it, or expose it in browser code. Add the same Cloudinary variables to the deployment environment, such as Vercel Project Settings → Environment Variables.

## 🤝 Contributing

We welcome contributions! Please follow these steps:

1. Fork the repository
2. Create a feature branch (`git checkout -b feature/your-feature`)
3. Commit your changes (`git commit -m 'Add some feature'`)
4. Push to the branch (`git push origin feature/your-feature`)
5. Open a Pull Request

## 📜 License

MIT License - see [LICENSE](LICENSE) for details.

## 📬 Contact

For questions or support, please contact:

- Email: anesh.angane@gmail.com
- GitHub Issues: [github.com/code-with-aneesh/wt-management/issues](https://github.com/code-with-aneesh/wt-management/issues)
