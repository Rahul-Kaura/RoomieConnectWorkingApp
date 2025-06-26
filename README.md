# RoomieConnect - AI-Powered Roommate Matching Algorithm

RoomieConnect is a modern web application designed to help users find compatible roommates through an intelligent, conversational chatbot. Built from the ground up, this project features a React frontend, a Node.js backend, and a dynamic matching algorithm that gets to know users' personalities and preferences.

## Features

- **Conversational Chatbot**: Instead of a boring form, users interact with a friendly chatbot that asks questions in a natural, conversational way.
- **Dynamic Questioning**: The chatbot doesn't just follow a script. It listens to user answers and asks relevant follow-up questions to gain deeper insight.
- **Weighted Scoring System**: A sophisticated algorithm scores user answers based on a weighted system that prioritizes key lifestyle habits for more accurate compatibility.
- **Intelligent Matching**: The backend finds the best matches by identifying users with similar compatibility scores (within a 2-point range) and ranking them.
- **Full-Stack Architecture**: The application is built with a modern React frontend and a robust Node.js (Express) backend, ensuring a smooth and responsive user experience.
- **In-Memory Database**: For rapid prototyping, user profiles are stored in a simple in-memory array on the server.

## Tech Stack

- **Frontend**:
  - **React.js**: For building the user interface.
  - **Axios**: For making API requests to the backend.
  - **Sentiment**: For analyzing the emotional tone of user answers.

- **Backend**:
  - **Node.js**: As the JavaScript runtime environment.
  - **Express.js**: As the web application framework.
  - **CORS**: For enabling cross-origin requests.
  - **Body-Parser**: For parsing incoming request bodies.

## How to Run This Project

1.  **Clone the Repository**:
    ```bash
    git clone https://github.com/Rahul-Kaura/MatchingAlgorithm-V1--RoomieConnect.git
    cd MatchingAlgorithm-V1--RoomieConnect
    ```

2.  **Install Dependencies for Both Frontend and Backend**:
    ```bash
    # Install backend dependencies
    cd backend
    npm install

    # Install frontend dependencies
    cd ../frontend
    npm install
    ```

3.  **Start the Backend Server**:
    *   In a new terminal window, navigate to the `backend` directory and run:
    ```bash
    node index.js
    ```
    *   The backend will start on `http://localhost:3001`.

4.  **Start the Frontend Application**:
    *   In another terminal window, navigate to the `frontend` directory and run:
    ```bash
    npm start
    ```
    *   The application will open in your browser at `http://localhost:3000`.

5.  **Start Matching!**
    *   Open two or more browser tabs to `http://localhost:3000` to create multiple user profiles and see the matching algorithm in action. 