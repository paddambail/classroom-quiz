export default function Head() {
  return (
    <>
      <script dangerouslySetInnerHTML={{__html: `try{(function(){var h=document.documentElement;if(h&&h.attributes){for(var i=h.attributes.length-1;i>=0;i--){var n=h.attributes[i].name; if(n && n.indexOf('webcrx')===0){h.removeAttribute(n);} } if(h.hasAttribute && h.hasAttribute('webcrx')){h.removeAttribute('webcrx');}}})()}catch(e){}`}} />
    </>
  );
}
