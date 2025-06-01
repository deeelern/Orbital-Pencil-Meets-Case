# Orbital-Pencil-Meets-Case


## Team Name:

Pencil Meets Case


## Proposed level of achievement:

Apollo 11


## Motivation

As NUS students ourselves, we’ve often seen how difficult it can be for peers—especially those in individual-focused faculties like Computing—to meet new people on campus. Many of our friends have expressed frustration with traditional dating apps, which often feel superficial, awkward, or detached from real life. At the same time, spontaneous in-person interactions have become increasingly rare.

To address this, we are challenging ourselves to design an app that makes it easier for students to form genuine connections right here on campus. Inspired by the power of face-to-face interaction, Pencil Meets Case uses near-proximity matching to encourage organic meetups, bridging the gap between digital tools and real-world conversations. Our project not only aims to enhance the student experience socially, but also provides us with an opportunity to deepen our understanding of mobile development, backend integration, and user-centered design. In the future, this platform could even evolve to support study meetups, campus events, or broader community-building initiatives.

Ultimately, we hope this project breathes life into the NUS campus experience—making it more connected, welcoming, and engaging for all.


## Scope of Project

Pencil Meets Case is a mobile application designed exclusively for NUS students to foster organic, face-to-face social connections through proximity-based matchmaking. The app leverages real-time location data to notify users when a nearby student matches their interests and preferences. Once both parties express interest, the app suggests a convenient on-campus location for a spontaneous meetup.

Users begin by setting up a detailed profile with their preferences, values, and interests. The app operates in the background, scanning for compatible users in close physical proximity. Upon a mutual match, the app facilitates an immediate real-world interaction, creating a natural bridge from digital introduction to in-person connection.

After the meetup, users can continue the conversation securely through the in-app messaging system. Additional features include adjustable privacy settings, location-sharing controls, social verification, and safety tools such as reporting and blocking mechanisms.

In future iterations, Pencil Meets Case could be expanded to support interest-based community features such as group meetups for study sessions, club activities, or event-based networking. This would allow the platform to evolve into a broader social ecosystem for students—enhancing both academic collaboration and campus life engagement.


## User Stories



1. User Registration and Profile Setup \
   As a new user, I want to sign up and set up my profile with personal details and preferences, so that I can represent myself authentically and receive relevant matches.

2. Privacy and Location Control \
   As a user, I want to control how my location is shared, so that I feel safe using the app while still benefiting from proximity-based features.

3. Proximity-Based Matching & Notification \
   As a user, I want to be notified when someone nearby fits my preferences and both of us express interest, so that we can be guided to a nearby spot on campus for a spontaneous meetup.

4. Guided On-Campus Meetups \
   As a user, I want the app to suggest convenient and safe locations on campus for in-person meetings, so that I can transition from online matching to real-life interaction easily.

5. In-App Messaging After Meetup \
   As a user, I want to chat through a secure in-app messaging system after the meetup, so that I can keep the conversation going in a safe environment.

6. Safety and Reporting Tools \
   As a user, I want the ability to report or block someone easily, so that I feel protected and in control of my experience.

7. Interaction History and Feedback \
   As a user, I want to view my past matches and meetings, so that I can track my connections and reflect on my interactions.


## Functions/Features


## __Developed Features__


### __Feature 1: User Onboarding & Authentication__



* Email/password sign up and login using Firebase Authentication
* Firestore user document is only created after full profile completion and uploaded onto Firebase database
* Conditional navigation flow based on whether the user is signing up or editing

<img src="https://github.com/user-attachments/assets/8b05877e-a443-40b2-9359-aebda95dc0ac" alt="welcomepage" width="200"/>
<img src="https://github.com/user-attachments/assets/3a30d8e5-559b-4533-8346-66329080d445" alt="createaccountpage" width="200"/>

### 


### __Feature 2: Multi-Step Profile Creation__



* Collects personal details including name, birthdate, gender, education, school, job title, height, religion, and ethnicity
* Allows users to select and answer up to 5 personal prompts
* Users can upload and preview up to 6 photos, which are uploaded to Cloudinary
* Users specify preferences such as preferred age range, distance, relationship goals, habits, education level, and more

<img src="https://github.com/user-attachments/assets/ed5f2f68-72b3-4825-af48-2335edbd0da5" alt="profilecreationpage" width="200"/>
<img src="https://github.com/user-attachments/assets/730af555-9ec1-4c2d-8d0c-3d1fc8697ee7" alt="promptspage" width="200"/>
<img src="https://github.com/user-attachments/assets/d0582cc5-a59c-4986-8406-cdb625a2c8db" alt="preferencespage" width="200"/>
<img src="https://github.com/user-attachments/assets/b9c01cd2-387a-4f27-9e95-1e24571c94d9" alt="photouploadpage" width="200"/>


### 


### __Feature 3: Editing Capabilities__


* Users can:
    * Edit their profile
    * Update photos
    * Modify preferences
    * Settings page to modify in-app preferences
 
<img src="https://github.com/user-attachments/assets/18a6d6e2-6610-46e7-9cbc-39f0b40f3e06" alt="profilepagemain" width="200"/>
<img src="https://github.com/user-attachments/assets/bbd7b86b-d0ab-4d65-8031-c8867c44f540" alt="settingspage" width="200"/>


## 


## __To-Be-Developed Features (Planned)__


### __Feature 1: Near Proximity Matching (Core)__



* Detects when users are physically near each other on campus
* Sends automatic notifications or prompts for spontaneous connection
* Likely requires background location and Bluetooth/Wi-Fi scanning


### __Feature 2: Integrated Scheduling Tool (Core)__



* Users can suggest and confirm meeting times and places within the app
* Supports scheduling real-life meetups and syncing with personal calendars


### __Feature 3: In-App Messaging (Core)__



* Secure, real-time chat system for matched users
* Includes typing indicators, read receipts, and multimedia support
* To be implemented using Firestore or a real-time backend (e.g. socket server)


### __Feature 4: Safety and Privacy Toolkit (Extension)__



* Includes options to block or report users
* Customizable location sharing settings (e.g., visibility windows or fuzzed radius)
* Privacy controls for who can see profile, photos, and availability




## Proposed Program Flow

![Pencil Meets Case_Programme Flow](https://github.com/user-attachments/assets/4636a902-1d68-4e7f-87b0-4dfc35c3708e)


## Development Plan


<table>
  <tr>
   <td><strong>Task</strong>
   </td>
   <td><strong>Description</strong>
   </td>
   <td><strong>Date</strong>
   </td>
  </tr>
  <tr>
   <td>Prepare Liftoff Poster and Video
   </td>
   <td>Create the liftoff Poster and record a 1-min pitch to summarize app concept 
   </td>
   <td>19 May 2025
   </td>
  </tr>
  <tr>
   <td>Pick Up Necessary Skills	
   </td>
   <td>Familiarize with core technologies: React Native, Firebase (Auth, Firestore), Expo, and Git workflows.
   </td>
   <td>20 - 23 May 2025
   </td>
  </tr>
  <tr>
   <td>Prototype Creation	
   </td>
   <td>Design and prototype key pages like Sign Up, Profile Setup, Preferences, and Profile View.
   </td>
   <td>24 May - 28 May 2025
   </td>
  </tr>
  <tr>
   <td>Implement Authentication	
   </td>
   <td>Integrate Firebase Authentication to enable sign up and log in via email and password.
   </td>
   <td>29 May 2025
   </td>
  </tr>
  <tr>
   <td>Create Profile Setup Flow	
   </td>
   <td>Build multistep onboarding: user info form → prompt responses → photo upload → preferences selection.
   </td>
   <td>30 May 2025
   </td>
  </tr>
  <tr>
   <td>Create logical navigation, features and pages
   </td>
   <td>Enable Profile Editing, Develop In-App Navigation, Build Preferences Module, Build Profile View, Implement Settings Page
   </td>
   <td>31 May - 1 Jun 2025
   </td>
  </tr>
  <tr>
   <td colspan="2" >Milestone 1: Core Flow + Authentication
<ul>

<li>Ideation (Readme)</li>

<li>Proof of Concept:</li> 
<ul>
 
<li>Sign Up / Log In via Firebase Auth</li>
 
<li>Profile Setup (Info, Prompts, Photos, Preferences)</li>
 
<li>Profile Edit from Me Screen</li>
 
<li>Navigation between Home, Profile, Settings</li> 
</ul></li> 
</ul>
   </td>
   <td>2 Jun 2025
   </td>
  </tr>
  <tr>
   <td>Implement In-App Chat	
   </td>
   <td>Enable real-time private messaging using Firebase or external SDK
   </td>
   <td>3 - 7 Jun 2025
   </td>
  </tr>
  <tr>
   <td>Build Geolocation Matching Engine	
   </td>
   <td>Integrate device geolocation and design proximity-based user discovery.
   </td>
   <td>8 - 15 Jun 2025
   </td>
  </tr>
  <tr>
   <td>Proximity Notification Logic	
   </td>
   <td>Alert user when someone within preference range is nearby (campus-based).
   </td>
   <td>16 - 18 Jun 2025
   </td>
  </tr>
  <tr>
   <td>Start ‘Discover’ / Matching Page
   </td>
   <td>Build frontend UI for discovering matched users (based on distance or filters).
   </td>
   <td>19 - 23 Jun 2025
   </td>
  </tr>
  <tr>
   <td>Refine Firestore Structure
   </td>
   <td>Optimize how profiles, messages, and preferences are stored and queried.
   </td>
   <td>24  - 25 Jun 2025
   </td>
  </tr>
  <tr>
   <td>Debugging & Testing	
   </td>
   <td>Conduct early tests to check form flow, Firestore writes, and proper merging of updates.
   </td>
   <td>26 - 29 Jun 2025
   </td>
  </tr>
  <tr>
   <td colspan="2" >Milestone 2: First Working Prototype
   </td>
   <td>30 Jun 2025
   </td>
  </tr>
  <tr>
   <td>Data Privacy & Safety Options
   </td>
   <td>Add toggles for photo visibility, report/block buttons, and safe profile handling.
   </td>
   <td>1 - 8 Jul 2025
   </td>
  </tr>
  <tr>
   <td>UI Enhancements Across Screens
   </td>
   <td>Apply consistent design styles, spacing, and interaction feedback (loading states, errors).
   </td>
   <td>9 - 14 Jul 2025
   </td>
  </tr>
  <tr>
   <td>Integrate Live Data	
   </td>
   <td>Ensure profile info dynamically syncs and updates across components (e.g., Me screen reloads).
   </td>
   <td>15 - 20 Jul 2025
   </td>
  </tr>
  <tr>
   <td>Debugging & Testing	
   </td>
   <td>Conduct early tests to check form flow, Firestore writes, and proper merging of updates.
   </td>
   <td>21 - 27 Jul 2025
   </td>
  </tr>
  <tr>
   <td colspan="2" >Milestone 3: Minimum Visible Product
   </td>
   <td>28 Jul 2025
   </td>
  </tr>
  <tr>
   <td>Further debugging and fixing of any issues
   </td>
   <td>Allocate time to fix any issues that arise during the deployment of the MVP
   </td>
   <td>29 Jul - 26 Aug 2025
   </td>
  </tr>
  <tr>
   <td colspan="2" >Splashdown
   </td>
   <td>27 Aug 2025
   </td>
  </tr>
</table>

## User Guide


### __For Android Device Users__



* If you own an Android device, you can directly install and run the .apk file: \

    1. Copy the .apk file to your Android device. \

    2. On your device, go to __Settings > Security__ and enable __Install from Unknown Sources__ (only if not enabled yet). \

    3. Open the .apk file using any file manager app. \

    4. Follow the on-screen instructions to complete the installation. \

    5. Launch the app from your home screen. \



### __For Testers Without an Android Device__



* If you're testing on a PC or laptop (without a physical Android device), you will need to install __Android Studio__: \

    1. Download and install __Android Studio__ from the[ official website](https://developer.android.com/studio). \

    2. Open Android Studio and set up an Android Virtual Device (AVD). \

    3. Load the .apk file into the AVD to simulate and test the app.
