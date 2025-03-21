# Weight Management Application

A SvelteKit-based web application for managing weight and height data, calculating BMI, and visualizing progress with interactive charts. Integrated with Firebase for authentication and Firestore for data storage.

## Features

- **User Authentication**: Google login via Firebase.
- **Weight & Height Tracking**: Input and store data with validation.
- **BMI Calculation**: Calculates BMI and categorizes it.
- **Healthy Weight Range**: Suggests a healthy weight range based on height.
- **Interactive Charts**: Visualize weight and height trends using Chart.js.
- **Responsive Design**: Optimized for mobile, tablet, and desktop.

## Setup

1. **Clone the Repository**:
   ```bash
   git clone <repository-url>
   cd wt-management
   ```

2. **Install Dependencies**:
   ```bash
   npm install
   ```

3. **Configure Firebase**:
   - Create a Firebase project.
   - Add your Firebase credentials to a `.env` file:
     ```
     VITE_API_KEY=your_api_key
     VITE_AUTH_DOMAIN=your_auth_domain
     VITE_PROJECT_ID=your_project_id
     ```

4. **Run the Development Server**:
   ```bash
   npm run dev
   ```

5. **Build for Production**:
   ```bash
   npm run build
   npm run preview
   ```

## Technologies Used

- **SvelteKit**: Framework for building the app.
- **Firebase**: Authentication and Firestore for data storage.
- **Chart.js**: Interactive charts for data visualization.
- **Tailwind CSS**: Utility-first CSS framework.

## Future Enhancements

- Add support for more authentication providers.
- Include additional metrics like body fat percentage.
- Add reminders for regular updates.
- Improve chart interactivity with zoom and detailed tooltips.

This application helps users track their weight and height, calculate BMI, and visualize progress effectively.
