const video = document.getElementById("video");
let lastEyeClosedTime = 0;
const alertThreshold = 3000; // 3 seconds in milliseconds

Promise.all([
    faceapi.nets.tinyFaceDetector.loadFromUri("/models"),
    faceapi.nets.faceLandmark68Net.loadFromUri("/models"),
    faceapi.nets.faceRecognitionNet.loadFromUri("/models"),
    faceapi.nets.faceExpressionNet.loadFromUri("/models"),
    faceapi.nets.ageGenderNet.loadFromUri("/models"),
]).then(webCam);

function webCam() {
    navigator.mediaDevices
        .getUserMedia({
            video: true,
            audio: false,
        })
        .then((stream) => {
            video.srcObject = stream;
        })
        .catch((error) => {
            console.log(error);
        });
}

video.addEventListener("play", () => {
    const canvas = faceapi.createCanvasFromMedia(video);
    document.body.append(canvas);

    faceapi.matchDimensions(canvas, { height: video.height, width: video.width });

    setInterval(async () => {
        const detection = await faceapi
            .detectAllFaces(video, new faceapi.TinyFaceDetectorOptions())
            .withFaceLandmarks()
            .withFaceExpressions().withAgeAndGender();
        canvas.getContext("2d").clearRect(0, 0, canvas.width, canvas.height);

        const resizedWindow = faceapi.resizeResults(detection, {
            height: video.height,
            width: video.width,
        });

        faceapi.draw.drawDetections(canvas, resizedWindow);
        faceapi.draw.drawFaceLandmarks(canvas, resizedWindow);
        faceapi.draw.drawFaceExpressions(canvas, resizedWindow);

        resizedWindow.forEach((detection) => {
            const box = detection.detection.box;
            const drawBox = new faceapi.draw.DrawBox(box, {
                label: Math.round(detection.age) + " year old " + detection.gender,
            });
            drawBox.draw(canvas);
        });

        // Check for closed eyes
        const eyesClosed = resizedWindow.some((face) => {
            const leftEye = face.landmarks.getLeftEye();
            const rightEye = face.landmarks.getRightEye();
            const leftEyeHeight = leftEye[4].y - leftEye[1].y; // Vertical distance between upper and lower eyelids of left eye
            const rightEyeHeight = rightEye[4].y - rightEye[1].y; // Vertical distance between upper and lower eyelids of right eye
            const threshold = 5; // Adjust as needed
            return leftEyeHeight < threshold && rightEyeHeight < threshold;
        });

        if (eyesClosed) {
            const now = new Date().getTime();
            if (now - lastEyeClosedTime > alertThreshold) {
                // Speak alert
                const alertUtterance = new SpeechSynthesisUtterance();
                alertUtterance.text = "Alert: Warning the eyes are closed!";
                speechSynthesis.speak(alertUtterance);

                // Update last eye closed time
                lastEyeClosedTime = now;
            }
        } else {
            // Reset last eye closed time
            lastEyeClosedTime = 0;
        }
    }, 100);
});
