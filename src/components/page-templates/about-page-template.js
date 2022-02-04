import React from "react";
import PropTypes from "prop-types";
import styled from "styled-components";
import Content from "../../components/Content";
import Image from "../../components/Image";
import { PageSectionStyles } from "../shared-styles/page-section-styles";
import { getImage } from "gatsby-plugin-image";

const ProfileImage = styled(Image)`
  margin-right: 10px;
`;

const AboutContent = styled.div`
  display: flex;
  flex-direction: row;
`;

export const AboutPageTemplate = ({
  title,
  image,
  content,
  contentComponent,
}) => {
  const heroImage = getImage(image) || image;
  const PageContent = contentComponent || Content;

  return (
    <PageSectionStyles>
      <h2 className="title is-size-3 has-text-weight-bold is-bold-light">
        {title}
      </h2>
      <AboutContent>
        <ProfileImage img={heroImage} height={300} width={300} />
        <PageContent className="content" content={content} />
      </AboutContent>
    </PageSectionStyles>
  );
};

AboutPageTemplate.propTypes = {
  title: PropTypes.string.isRequired,
  content: PropTypes.string,
  contentComponent: PropTypes.func,
};
