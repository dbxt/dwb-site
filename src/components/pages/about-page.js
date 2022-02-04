import React from "react";
import PropTypes from "prop-types";
import { graphql } from "gatsby";
import Layout from "../../components/Layout";
import { HTMLContent } from "../Content";
import { AboutPageTemplate } from "../page-templates/about-page-template";

const AboutPage = ({ data }) => {
  const { markdownRemark: post } = data;
  return (
    <Layout>
      <AboutPageTemplate
        contentComponent={HTMLContent}
        title={post.frontmatter.title}
        content={post.html}
        image={post.frontmatter.image}
      />
    </Layout>
  );
};

AboutPage.propTypes = {
  data: PropTypes.object.isRequired,
};

export default AboutPage;

export const aboutPageQuery = graphql`
  query AboutPageTemplate {
    markdownRemark(frontmatter: { templateKey: { eq: "about-page" } }) {
      html
      frontmatter {
        title
        image {
          childImageSharp {
            gatsbyImageData(quality: 100, placeholder: BLURRED, width: 300)
          }
        }
      }
    }
  }
`;
