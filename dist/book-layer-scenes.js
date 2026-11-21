window.BOOK_LAYER_SCENES = [];
(() => {
  const plan = window.BOOK_PLAN;
  if (!plan) return;
  function scene(chapterId, id, title, description, foreground) {
    const chapter = plan.chapters.find(chapter => chapter.id === chapterId);
    const art = chapter?.galleryImage;
    if (!art) return null;
    return {
      storyId: plan.storageId, chapterId, id, title, description, type:'panorama',
      unlock: art.unlock, artwork: art.src,
      light:{direction:[-.6,1,.5],warmth:[.78,.88,1],ambient:.68},
      panels:[{
        id:'backdrop', fold:'hinge', profile:'illustration', origin:[0,.024,-.57],
        width:1.84, height:1, angle:92, paper:'#849b92', edge:'#394a43',
        texture:art.src.replace('.webp','-480.webp'), reveal:[.04,.78],
      }, ...foreground],
    };
  }
  const pine = (id, x, h) => ({id, fold:'hinge', profile:'nature', origin:[x,.025,.2],
    width:.27, height:h, angle:87, paper:'#42635a', edge:'#293b33', reveal:[.28,1]});
  window.BOOK_POPUP_SCENES = [
    scene('chapter-01','frosthold-fall','Frosthold · Kızıl Gece',
      'Karlı ağaçların arkasında Frosthold’un taş surları yükselir.',[
        {id:'balcony',fold:'parallel',origin:[0,.025,.04],width:1.28,height:.18,span:.16,angle:90,paper:'#936960',edge:'#5d4340',reveal:[.17,.85]},
        pine('left-pine',-.63,.47),pine('right-pine',.62,.36),
      ]),
    scene('chapter-50','divine-awakening','Frosthold · İlahi Bedenin Uyanışı',
      'Frosthold’un harabeleri ve Fredo’nun altın ışığı kâğıt sahnede yükselir.',[
        {id:'ruins',fold:'hinge',profile:'architecture',origin:[-.52,.025,.06],width:.47,height:.43,angle:87,paper:'#847b79',edge:'#554c4c',reveal:[.18,.9]},
        {id:'silver-ray',fold:'v-fold',origin:[.21,.023,.27],width:.26,height:.34,angle:51,paper:'#c4d4ce',edge:'#739087',reveal:[.32,1]},
        pine('lone-pine',.65,.39),
      ]),
  ].filter(Boolean);
})();
