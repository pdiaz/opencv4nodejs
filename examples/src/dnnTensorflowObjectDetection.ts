
/**
 * Please refer to the python version of "ExploreOpencvDnn" by Saumya Shovan Roy.
 * For more detail: https://github.com/rdeepc/ExploreOpencvDnn
 */
import fs from "fs";
import path from "path";
import { Mat } from '@u4/opencv4nodejs';
import classNames from "./data/dnnTensorflowObjectDetectionClassNames";
import { cv, getCachedFile, getResource, runVideoDetection } from "./utils";
import pc from "picocolors";

async function main() {
  if (!cv.xmodules || !cv.xmodules.dnn) {
    console.error("exiting: opencv4nodejs compiled without dnn module");
    return;
  }

  // replace with path where you unzipped detection model
  const detectionModelPath = getResource("dnn/tf-detection");

  const pbFile = path.resolve(detectionModelPath, "frozen_inference_graph.pb");
  // const pbtxtFile = path.resolve(
  //   detectionModelPath,
  //   "ssd_mobilenet_v2_coco_2018_03_29.pbtxt"
  // );

  const pbtxtFile = await getCachedFile(getResource("dnn/tf-detection/ssd_mobilenet_v2_coco_2018_03_29.pbtxt"), 'https://raw.githubusercontent.com/opencv/opencv_extra/master/testdata/dnn/ssd_mobilenet_v2_coco_2018_03_29.pbtxt')
  
  // https://gist.githubusercontent.com/dkurt/54a8e8b51beb3bd3f770b79e56927bd7/raw/2a20064a9d33b893dd95d2567da126d0ecd03e85/ssd_mobilenet_v3_large_coco_2020_01_14.pbtxt

  if (!fs.existsSync(pbtxtFile)) {
    console.log(`Could not find detection model ${pbtxtFile}`);
    console.log("Download the model from: http://download.tensorflow.org/models/object_detection/ssd_mobilenet_v2_coco_2018_03_29.tar.gz")
    console.log("See doc https://github.com/opencv/opencv/wiki/TensorFlow-Object-Detection-API#use-existing-config-file-for-your-model");
    return;
  }

  // set webcam port
  const webcamPort = 0;

  if (!fs.existsSync(pbFile)) {
    throw new Error(`Could not find detection model ${pbFile}`);
  }
  if (!fs.existsSync(pbtxtFile)) {
    throw new Error(`Could not find ${pbtxtFile}`);
  }
  // initialize tensorflow darknet model from modelFile
  const net = cv.readNet(pbFile, pbtxtFile);
  
  const classifyImg = (img: Mat) => {
    // object detection model works with 300 x 300 images
    const size = new cv.Size(300, 300);
    const vec3 = new cv.Vec3(0, 0, 0);

    // network accepts blobs as input
    const inputBlob = cv.blobFromImage(img, { scaleFactor: 1, size, mean: vec3, swapRB: true, crop: true } );
    net.setInput(inputBlob);

    console.time("net.forward");
    // forward pass input through entire network, will return
    // classification result as 1x1xNxM Mat
    const outputBlob = net.forward();
    console.timeEnd("net.forward");

    // get height and width from the image
    const [imgHeight, imgWidth] = img.sizes;
    const numRows = outputBlob.sizes.slice(2, 3);
    // this code looks brotken
    for (let y = 0; y < numRows[0]; y += 1) {
      const confidence = outputBlob.at([0, 0, y, 2]);
      if (confidence > 0.5) {
        const classId = outputBlob.at([0, 0, y, 1]);
        const className = classNames[classId];
        const boxX = imgWidth * outputBlob.at([0, 0, y, 3]);
        const boxY = imgHeight * outputBlob.at([0, 0, y, 4]);
        const boxWidht = imgWidth * outputBlob.at([0, 0, y, 5]);
        const boxHeight = imgHeight * outputBlob.at([0, 0, y, 6]);

        const pt1 = new cv.Point2(boxX, boxY);
        const pt2 = new cv.Point2(boxWidht, boxHeight);
        const rectColor = new cv.Vec3(23, 230, 210);
        const rectThickness = 2;
        const rectLineType = cv.LINE_8;

        // draw the rect for the object
        img.drawRectangle(pt1, pt2, rectColor, rectThickness, rectLineType);

        const text = `${className} ${confidence.toFixed(5)}`;
        const org = new cv.Point2(boxX, boxY + 15);
        const fontFace = cv.FONT_HERSHEY_SIMPLEX;
        const fontScale = 0.5;
        const textColor = new cv.Vec3(255, 0, 0);
        const thickness = 2;

        // put text on the object
        img.putText(text, org, fontFace, fontScale, textColor, thickness);
      }
    }

    cv.imshow("Temsorflow Object Detection", img);
  };

  runVideoDetection(webcamPort, classifyImg);
}

main().catch(console.error);