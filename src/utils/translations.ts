export type Language = 'en' | 'kn';

export interface Translations {
  common: {
    views: string;
    justNow: string;
    comments: string;
    noComments: string;
    leaveComment: string;
    likes: string;
  };
  nav: {
    home: string;
    videos: string;
    community: string;
    chat: string;
    contact: string;
    watchTutorials: string;
    adminStudio: string;
    searchPlaceholder: string;
    matchingTutorials: string;
    found: string;
    signIn: string;
    signOut: string;
    topFan: string;
    admin: string;
  };
  hero: {
    kicker: string[];
    title: string;
    titleLine1: string;
    titleLine2: string;
    subtext: string;
    watchTutorials: string;
    liveChat: string;
    makingTechEasy: string;
    curiousMinds: string;
  };
  about: {
    kicker: string;
    title: string;
    description: string;
    exploreTutorials: string;
  };
  videosSection: {
    kicker: string;
    header: string;
    subtext: string;
    searchTutorials: string;
    allCategories: string;
    openVideo: string;
    playTutorial: string;
    watchParty: string;
    minRead: string;
    noVideosFound: string;
    viewsLabel: string;
    commentsLabel: string;
  };
  communitySection: {
    kicker: string;
    header: string;
    subtext: string;
    verifiedReviews: string;
    leaveReview: string;
    closeForm: string;
    shareExperience: string;
    fullName: string;
    roleOrTitle: string;
    rating: string;
    reviewContent: string;
    publishReview: string;
    topFanBadge: string;
    noReviewsFound: string;
  };
  liveChatSection: {
    kicker: string;
    header: string;
    subtext: string;
    typeMessage: string;
    send: string;
    signInToChat: string;
  };
  contactSection: {
    kicker: string;
    header: string;
    subtext: string;
    fullName: string;
    emailAddress: string;
    subjectTopic: string;
    messageQuestion: string;
    sendEmailBtn: string;
    directInboxNote: string;
    messageSentSuccess: string;
    deliveredBadge: string;
    mailToMobile: string;
    emailValidationError: string;
  };
  socialSection: {
    kicker: string;
    header: string;
    subtext: string;
    subscribe: string;
    follow: string;
    connect: string;
  };
  footer: {
    tagline: string;
    quickLinks: string;
    contactUsOn: string;
    mailTopsonMedia: string;
    allRightsReserved: string;
  };
}

export const translations: Record<Language, Translations> = {
  en: {
    common: {
      views: 'Views',
      justNow: 'Just now',
      comments: 'Comments',
      noComments: 'No comments yet. Be the first to share your thoughts!',
      leaveComment: 'Leave a comment...',
      likes: 'Likes',
    },
    nav: {
      home: 'Home',
      videos: 'Videos',
      community: 'Community',
      chat: 'Live Chat',
      contact: 'Contact',
      watchTutorials: 'Watch tutorials',
      adminStudio: 'Admin Studio',
      searchPlaceholder: 'search',
      matchingTutorials: 'Matching tutorials:',
      found: 'found',
      signIn: 'Sign In',
      signOut: 'Sign Out',
      topFan: 'Top Fan',
      admin: 'Admin',
    },
    hero: {
      kicker: ['THE', 'EVERYDAY', 'TECH', 'ADVANTAGE'],
      title: "I'm topson media",
      titleLine1: "I'm",
      titleLine2: 'topson media',
      subtext: 'Empowering you with Phone & PC tutorials, tips, and digital skills.',
      watchTutorials: 'Watch tutorials',
      liveChat: 'Live Chat',
      makingTechEasy: 'Making tech feel easy',
      curiousMinds: 'For curious minds everywhere',
    },
    about: {
      kicker: 'WHO IS TOPSON MEDIA?',
      title: 'Crafting digital confidence, one screen at a time.',
      description:
        'We simplify smartphones, computing, hardware tricks, and software shortcuts so anyone can master the devices they hold every single day.',
      exploreTutorials: 'Explore Tutorials',
    },
    videosSection: {
      kicker: 'CURATED TUTORIALS & SHORT REELS',
      header: 'Watch the latest tutorials',
      subtext: 'Step-by-step guides covering smartphone optimization, PC performance, and essential digital workflows.',
      searchTutorials: 'Search tutorials by title, keyword, or device...',
      allCategories: 'All',
      openVideo: 'Open Video',
      playTutorial: 'Play Tutorial',
      watchParty: 'Watch Party',
      minRead: 'min read',
      noVideosFound: 'No tutorials available yet. New videos will appear here dynamically.',
      viewsLabel: 'Views',
      commentsLabel: 'Comments',
    },
    communitySection: {
      kicker: 'TESTIMONIALS & REVIEWS',
      header: 'Hear from the community',
      subtext: 'Real experiences and feedback from students and tech enthusiasts worldwide.',
      verifiedReviews: 'Verified Community Reviews',
      leaveReview: 'Leave your review',
      closeForm: 'Close Form',
      shareExperience: 'Share your feedback with Topson Media',
      fullName: 'Your Full Name',
      roleOrTitle: 'Your Role / Profession',
      rating: 'Rating',
      reviewContent: 'Your Review or Experience',
      publishReview: 'Publish Review',
      topFanBadge: 'Top Fan',
      noReviewsFound: 'No reviews yet. Be the first to share your experience with Topson Media!',
    },
    liveChatSection: {
      kicker: 'TOPIC DISCUSSIONS & DIRECT ASSISTANCE',
      header: 'Chat me live',
      subtext: 'Direct two-way messaging for phone tips, PC tweaks, and digital skills.',
      typeMessage: 'Type your message...',
      send: 'Send',
      signInToChat: 'Sign in to chat live',
    },
    contactSection: {
      kicker: 'DIRECT INBOX',
      header: 'Get in Touch via Email',
      subtext: 'Fill in your question or tutorial request to receive a reply directly to your personal email inbox.',
      fullName: 'Your Full Name',
      emailAddress: 'Your Email Address',
      subjectTopic: 'Subject Topic',
      messageQuestion: 'Your Message or Question',
      sendEmailBtn: 'Send email message',
      directInboxNote: 'Directly sent to Topson Media inbox.',
      messageSentSuccess: 'Message sent successfully!',
      deliveredBadge: 'Delivered',
      mailToMobile: 'mail topson media',
      emailValidationError: 'Uzuza imere (Email) ihamye kandi ibaho neza!',
    },
    socialSection: {
      kicker: 'CONNECT ON SOCIAL',
      header: 'Dive in my social medias',
      subtext: 'Follow along on your preferred channel.',
      subscribe: 'Subscribe',
      follow: 'Follow',
      connect: 'Connect',
    },
    footer: {
      tagline: 'Practical tutorials, honest device breakdowns, and everyday tech mastery.',
      quickLinks: 'Quick Links',
      contactUsOn: 'Contact us on',
      mailTopsonMedia: 'mail topson media',
      allRightsReserved: 'All rights reserved.',
    },
  },
  kn: {
    common: {
      views: 'Inshuro yarebwe',
      justNow: 'Ubu ngubu',
      comments: 'Ibitekerezo',
      noComments: 'Nta bitekerezo birajyaho. Ba uwa mbere gutanga igitekerezo!',
      leaveComment: 'Tanga igitekerezo cyawe...',
      likes: 'Abakunze',
    },
    nav: {
      home: 'Ahabanza',
      videos: 'Video',
      community: 'Abanyamuryango',
      chat: 'Ganira nanjye',
      contact: 'Twandikire',
      watchTutorials: 'Reba tutorials',
      adminStudio: 'Admin Studio',
      searchPlaceholder: 'shakisha',
      matchingTutorials: 'Tutorials zibonetse:',
      found: 'zabonywe',
      signIn: 'Injira',
      signOut: 'Sohoka',
      topFan: 'Top Fan',
      admin: 'Umuyobozi',
    },
    hero: {
      kicker: ['UBWENGE', 'BW\'IKORANABUHANGA', 'BURI', 'MUNSI'],
      title: "I'm topson media",
      titleLine1: "I'm",
      titleLine2: 'topson media',
      subtext: 'Kugushoboza binyuze muli tutorials za Phone & PC, inama, ndetse n\'ubushobozi bw\'ikoranabuhanga.',
      watchTutorials: 'Reba tutorials',
      liveChat: 'Ganira nanjye',
      makingTechEasy: 'Kworoshya ikoranabuhanga',
      curiousMinds: 'Ku bantu bose bakunda kumenya',
    },
    about: {
      kicker: 'TOPSON MEDIA NI NDE?',
      title: 'Kubaka icyizere mu ikoranabuhanga, intambwe ku yindi.',
      description:
        'Dukuraho urujijo kuri telefone, mudasobwa, n\'ubuhanga bwo gukoresha porogaramu kugira ngo buri wese yisanzure mu byo akoresha buri munsi.',
      exploreTutorials: 'Reba tutorials zose',
    },
    videosSection: {
      kicker: 'TUTORIALS N\'AMASHUSHO MATO YATORANYIJWE',
      header: 'Reba tutorials zigezweho',
      subtext: 'Inzira z\'intambwe ku yindi mu kuvugurura telefone, mudasobwa, n\'ubumenyi bw\'ingenzi mu ikoranabuhanga.',
      searchTutorials: 'Shakisha tutorials ukurikije umutwe, ikoranabuhanga...',
      allCategories: 'Byose',
      openVideo: 'Fungura Video',
      playTutorial: 'Reba Tutorial',
      watchParty: 'Rebera Hamwe',
      minRead: 'min gusoma',
      noVideosFound: 'Nta tutorials zirashyirwaho. Video nshya zizagaragara hano vuba.',
      viewsLabel: 'Inshuro yarebwe',
      commentsLabel: 'Ibitekerezo',
    },
    communitySection: {
      kicker: 'UBUHAMYA N\'IBITEKEREZO',
      header: 'Ibyo abanyamuryango bavuga',
      subtext: 'Ubuhamya nyakuri n\'ibitekerezo by\'abanyamuryango n\'abakunzi b\'ikoranabuhanga ku isi yose.',
      verifiedReviews: 'Ibitekerezo by\'abanyamuryango byemejwe',
      leaveReview: 'Tanga igitekerezo cyawe',
      closeForm: 'Funga Ifishi',
      shareExperience: 'Sangiza igitekerezo cyawe na Topson Media',
      fullName: 'Amazina yawe yose',
      roleOrTitle: 'Umwuga wawe / Icyo ukora',
      rating: 'Amanota',
      reviewContent: 'Igitekerezo cyawe cyangwa Ubuhamya',
      publishReview: 'Ohereza Igitekerezo',
      topFanBadge: 'Top Fan',
      noReviewsFound: 'Nta bitekerezo birashyirwaho. Ba uwa mbere gusangiza ubuhamya bwawe na Topson Media!',
    },
    liveChatSection: {
      kicker: 'IBIGANIRO N\'UBWUFASHO BW\'IKORANABUHANGA',
      header: 'Ganira nanjye',
      subtext: 'Ubutumwa bwawe bwihuse ku nama za telefone, mudasobwa, n\'ubushobozi bwa tekiniki.',
      typeMessage: 'Andika ubutumwa bwawe hano...',
      send: 'Ohereza',
      signInToChat: 'Injira kugira ngo uganire natwe',
    },
    contactSection: {
      kicker: 'KURI EMAIL',
      header: 'Twandikire binyuze kuri Email',
      subtext: 'Andika ikibazo cyawe cyangwa icyifuzo cya tutorial kugira ngo usubizwe kuri email yawe bwite.',
      fullName: 'Amazina yawe yose',
      emailAddress: 'Aderesi ya Email yawe',
      subjectTopic: 'Impamvu y\'ubutumwa',
      messageQuestion: 'Ubutumwa bwawe cyangwa Ikibazo',
      sendEmailBtn: 'Yohereza ubutumwa',
      directInboxNote: 'Byoherezwa mu gasanduku ka Topson Media.',
      messageSentSuccess: 'Ubutumwa bwoherejwe neza!',
      deliveredBadge: 'Bwagezeyo',
      mailToMobile: 'mail topson media',
      emailValidationError: 'Uzuza imere (Email) ihamye kandi ibaho neza!',
    },
    socialSection: {
      kicker: 'DUSANGIZE KU MBUGA NKORANYAMBAGA',
      header: 'Dukurikire ku mbuga zacu',
      subtext: 'Dukurikire ku mbuga zikunzwe cyane.',
      subscribe: 'Iyandikishe',
      follow: 'Dukurikire',
      connect: 'Tumenyane',
    },
    footer: {
      tagline: 'Tutorials zizewe, ubusobanuro ku bikoresho, no kumenya ikoranabuhanga rya buri munsi.',
      quickLinks: 'Ahashakishwa vuba',
      contactUsOn: 'Twandikire kuri',
      mailTopsonMedia: 'mail topson media',
      allRightsReserved: 'Uburenganzira bwose burabitswe.',
    },
  },
};
