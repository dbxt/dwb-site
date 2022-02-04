import { GatsbyImage } from "gatsby-plugin-image";
import React from "react";

export default function ImageImage(props) {
  const { height = "auto", width = "auto", img, className } = props;

  if (img?.url) {
    return (
      <img
        className={className}
        src={img}
        objectFit={"cover"}
        style={{
          gridArea: "1/1",
          // You can set a maximum height for the image, if you wish.
          height: height,
          width: width,
        }}
        // You can optionally force an aspect ratio for the generated image
        aspectratio={3 / 1}
        // This is a presentational image, so the alt should be an empty string
        alt=""
        formats={["auto", "webp", "avif"]}
      />
    );
  } else {
    return (
      <GatsbyImage
        image={img}
        className={className}
        // objectFit={"cover"}
        style={{
          //gridArea: "1/1",
          // You can set a maximum height for the image, if you wish.
          minHeight: height,
          height: height,
          maxHeight: height,
          minWidth: width,
          width: width,
          maxWidth: width,
        }}
        // layout="fullWidth"
        // You can optionally force an aspect ratio for the generated image
        // aspectratio={3 / 1}
        // This is a presentational image, so the alt should be an empty string
        alt=""
        formats={["auto", "webp", "avif"]}
      />
    );
  }
}
