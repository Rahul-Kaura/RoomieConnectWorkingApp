# 🔑 Test Profile Login Credentials

## How to Use These Credentials

These are **Auth0 test accounts** corresponding to the 5 backend test profiles. Use these to test the app as different users and see how they match with each other.

---

## 📋 Test User Accounts

### 1. 👨‍💻 **Alex Chen** (Computer Science)
- **Email**: `alex.chen.test@roomieconnect.app`
- **Password**: `TestUser123!`
- **Profile**: Morning person, tidy, quiet, private, non-smoker
- **Location**: Berkeley, CA
- **Major**: Computer Science
- **Instagram**: @alexchen_cs

### 2. 👩‍🔬 **Maya Patel** (Biology)  
- **Email**: `maya.patel.test@roomieconnect.app`
- **Password**: `TestUser123!`
- **Profile**: Night owl, relaxed cleanliness, likes music, social, bothered by smoking
- **Location**: Stanford, CA
- **Major**: Biology
- **Instagram**: @maya_bio
- **Allergies**: Peanuts

### 3. 👨‍💼 **Jordan Kim** (Business)
- **Email**: `jordan.kim.test@roomieconnect.app` 
- **Password**: `TestUser123!`
- **Profile**: Morning person, moderate cleanliness, quiet, social, non-smoker
- **Location**: San Francisco, CA
- **Major**: Business
- **Instagram**: @jordankim_biz

### 4. 👩‍🧠 **Sofia Rodriguez** (Psychology)
- **Email**: `sofia.rodriguez.test@roomieconnect.app`
- **Password**: `TestUser123!`
- **Profile**: Night owl, tidy, likes music, private, bothered by smoking  
- **Location**: Oakland, CA
- **Major**: Psychology
- **Instagram**: @sofia_psych
- **Allergies**: Shellfish

### 5. 👨‍🔧 **Marcus Johnson** (Engineering)
- **Email**: `marcus.johnson.test@roomieconnect.app`
- **Password**: `TestUser123!`
- **Profile**: Morning person, relaxed cleanliness, quiet, flexible on guests, non-smoker
- **Location**: San Jose, CA  
- **Major**: Engineering
- **Instagram**: @marcus_eng

---

## 🎯 **Compatibility Testing**

### High Compatibility Matches:
- **Alex & Jordan**: Both morning people, quiet, non-smokers
- **Maya & Sofia**: Both night owls, like music, bothered by smoking

### Moderate Compatibility:
- **Alex & Marcus**: Both morning people and non-smokers, but different cleanliness levels
- **Maya & Jordan**: Different sleep schedules but both social

### Lower Compatibility:
- **Alex & Maya**: Opposite sleep schedules, different noise preferences

---

## 🚀 **Testing Instructions**

1. **Login as Alex Chen** → Complete chatbot → See matches
2. **Logout** → **Login as Maya Patel** → Complete chatbot → See different matches  
3. **Compare compatibility scores** between different user pairs
4. **Test messaging** between matched users
5. **Test profile persistence** by refreshing and logging back in

---

## ⚠️ **Important Notes**

- These accounts need to be **created in Auth0** manually or via script
- Each user will have their **own Firebase profile** once they complete the chatbot
- **Backend test profiles** are separate and used for matching algorithm  
- Use **different browsers/incognito** to test multiple users simultaneously

---

## 🔧 **Admin Access**

If you need to **reset test data** or **clear profiles**:
- Check Firebase Realtime Database console
- Check Auth0 user management
- Backend test profiles are hardcoded and always available 