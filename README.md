# Weight Management Application

A comprehensive SvelteKit-based web application for tracking weight, height, and BMI with interactive visualizations and secure cloud storage.

## ✨ Key Features

- 🔒 **Secure Authentication** - Google login via Firebase
- 📊 **Data Tracking** - Record weight and height with input validation
- ⚖️ **BMI Insights** - Automatic BMI calculation with health categorization
- 🎯 **Personalized Goals** - Healthy weight range suggestions based on height
- 📈 **Interactive Visualizations** - Beautiful charts using Chart.js
- 📱 **Fully Responsive** - Optimized for all device sizes

## 🚀 Quick Start

### Prerequisites

- Node.js v16+
- Firebase account
- Modern web browser

### Installation

1. Clone the repository:

```bash
git clone https://github.com/your-repo/wt-management.git
cd wt-management
```

2. Install dependencies:

```bash
npm install
```

3. Set up Firebase configuration:
   1. Create a Firebase project at [firebase.google.com](https://firebase.google.com)
   2. Create a `.env` file in the root directory:

```env
VITE_API_KEY=your_firebase_api_key
VITE_AUTH_DOMAIN=your_project.firebaseapp.com
VITE_PROJECT_ID=your_project_id
VITE_STORAGE_BUCKET=your_bucket.appspot.com
VITE_MESSAGING_SENDER_ID=your_sender_id
VITE_APP_ID=your_app_id
```

4. Run the development server:

```bash
npm run dev
```

5. Open your browser to: `http://localhost:5173`

## 🛠️ Building for Production

```bash
npm run build
npm run preview
```

## 🧰 Technology Stack

| Component        | Technology    |
| ---------------- | ------------- |
| Framework        | SvelteKit     |
| Authentication   | Firebase Auth |
| Database         | Firestore     |
| Charts           | Chart.js      |
| Styling          | Tailwind CSS  |
| State Management | Svelte Stores |

## 📅 Future Roadmap

### Planned Enhancements

- [ ] Multi-provider authentication (Facebook, Apple, Email)
- [ ] Advanced body metrics (body fat, muscle mass)
- [ ] Customizable reminders and notifications
- [ ] Enhanced chart features (zoom, export, annotations)
- [ ] Mobile app (via Capacitor or similar)

### Known Issues

- [ ] Chart loading performance on low-end devices
- [ ] Timezone handling for date tracking

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
- GitHub Issues: [github.com/your-repo/issues](https://github.com/code-with-aneesh/wt-management/issues)
