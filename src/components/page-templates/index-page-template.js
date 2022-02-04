import React from "react";
import PropTypes from "prop-types";
import { Link } from "gatsby";
import { getImage } from "gatsby-plugin-image";

import Features from "../../components/Features";
import ArticleSummaryList from "../ArticleSummaryList";
import FullWidthImage from "../../components/FullWidthImage";
import { PageSectionStyles } from "../shared-styles/page-section-styles";

export const IndexPageTemplate = ({
  image,
  title,
  heading,
  subheading,
  mainpitch,
  description,
  intro,
}) => {
  const heroImage = getImage(image) || image;

  return (
    <div>
      <FullWidthImage img={heroImage} title={title} subheading={subheading} />
      <PageSectionStyles>
        <div className="content">
          <div className="tile">
            <h1 className="title">{mainpitch.title}</h1>
          </div>
          <div className="tile">
            <h3 className="subtitle">{mainpitch.description}</h3>
          </div>
        </div>
        <div className="columns">
          <div className="column is-12">
            <h3 className="has-text-weight-semibold is-size-2">{heading}</h3>
            <p>{description}</p>
          </div>
        </div>
        <Features gridItems={intro.blurbs} />
        <div className="columns">
          <div className="column is-12 has-text-centered">
            <Link className="btn" to="/products">
              See all products
            </Link>
          </div>
        </div>
        <div className="column is-12">
          <h3 className="has-text-weight-semibold is-size-2">Latest stories</h3>
          <ArticleSummaryList />
          <div className="column is-12 has-text-centered">
            <Link className="btn" to="/blog">
              Read more
            </Link>
          </div>
        </div>
      </PageSectionStyles>
    </div>
  );
};

IndexPageTemplate.propTypes = {
  image: PropTypes.oneOfType([PropTypes.object, PropTypes.string]),
  title: PropTypes.string,
  heading: PropTypes.string,
  subheading: PropTypes.string,
  mainpitch: PropTypes.object,
  description: PropTypes.string,
  intro: PropTypes.shape({
    blurbs: PropTypes.array,
  }),
};
