var E={VERSION:"1.0.0",MAX_CONCURRENT_VALIDATIONS:5,STORAGE_KEYS:{SETTINGS:"settings",ASSESSMENTS:"assessments",SELECTED_ASSESSMENTS:"selectedAssessments",CONTEXTS:"contexts",VALIDATIONS:"validations",REVIEWS:"reviews",LAST_RUN:"lastRun",LAST_ACTION:"lastAction",DEBUG:"debug",WHATS_NEW_MODAL:"whatsNewModalState"}},Z={PRIMARY_ASSESSMENTS:"https://cairois.web.boeing.com/api/asset/4/82/assessment/type/35",ASSESSMENT_DETAIL:"https://cairois.web.boeing.com/api/assessment/{id}/detail",ASSESSMENT_ANSWERS:"https://cairois.web.boeing.com/api/assessment/survey/{id}/answers",ASSESSMENT_CONTACTS:"https://cairois.web.boeing.com/api/assessment/{id}/contacts",SURVEY_TEMPLATE_QUESTIONS:"https://cairois.web.boeing.com/api/survey/template/{id}/questions",SURVEY_TEMPLATE_DETAIL:"https://cairois.web.boeing.com/api/surveyTemplate/{id}",SURVEY_TEMPLATES_RP_APP:"https://cairois.web.boeing.com/api/surveyTemplate?where=alternateSurveyTemplateId:=:rp-app",REVIEW_SUMMARY:"https://cairois.web.boeing.com/api/asset/4/{assetId}/assessment/review/summaries?assessmentTypeId=35&reviewTypeId=6",ESATS_VERSIONS:"https://service-gateway.tas-phx.apps.boeing.com/gateway/asset/BusinessApplicationVersion/GetBusinessApplicationVersions?esatsId={assetId}",ESATS_ARTIFACTS:"https://service-gateway.tas-phx.apps.boeing.com/gateway/asset/BusinessApplicationVersionDocument/GetBusinessApplicationVersionPolicyAndArtifacts?esatsId={versionEsatsId}",ESATS_CONTACT_DETAILS_SUMMARY:"https://service-gateway.tas-phx.apps.boeing.com/gateway/asset/BusinessApplicationSummary/GetContactDetailsSummary?esatsId={assetId}",GTC_LOOKUP:"https://termbank.web.boeing.com/ses/v1.2/GlobalTradeControlVocabularies/name/{name}.json"},Le=[{id:"cairo",name:"Cairo",url:Z.PRIMARY_ASSESSMENTS,openUrl:"https://cairois.web.boeing.com/",expectedHosts:["cairois.web.boeing.com"]},{id:"esats",name:"ESATS",url:"https://service-gateway.tas-phx.apps.boeing.com/",openUrl:"https://esats.web.boeing.com/",expectedHosts:["service-gateway.tas-phx.apps.boeing.com","esats.web.boeing.com"]},{id:"gtc",name:"GTC",url:"https://termbank.web.boeing.com/",openUrl:"https://gtc-ecm.web.boeing.com/",expectedHosts:["termbank.web.boeing.com","gtc-ecm.web.boeing.com"]}];async function pe(e){return(await chrome.storage.local.get(e))[e]}async function Ie(){return await pe(E.STORAGE_KEYS.ASSESSMENTS)||[]}async function Oe(){return await pe(E.STORAGE_KEYS.VALIDATIONS)||[]}async function $e(){return await pe(E.STORAGE_KEYS.REVIEWS)||[]}async function oe(){return(await chrome.storage.local.get("failedAssessments")).failedAssessments||[]}async function ke(){return(await chrome.storage.local.get("assessmentContexts")).assessmentContexts||{}}function Me(e,t){let n=[...e];if(t.search&&t.search.trim())if(t.regexMode)try{let s=new RegExp(t.search,"i");n=n.filter(r=>s.test(r.assetName||""))}catch{return[]}else{let s=t.search.toLowerCase();n=n.filter(r=>(r.assetName||"").toLowerCase().includes(s))}return t.fromDate&&(n=n.filter(s=>{let r=De(s,t.dateFilterField);return!!r&&r>=t.fromDate})),t.toDate&&(n=n.filter(s=>{let r=De(s,t.dateFilterField);return!!r&&r<=t.toDate})),t.assessmentStatus&&(n=n.filter(s=>{let r=ie(s);return!(t.assessmentStatus==="incomplete"&&!r||t.assessmentStatus==="completed"&&r)})),n}function ie(e){return!!(e.incompleteAssessmentId||e.hasIncomplete)}function ot(e,t){return t==="dueOn"?e.dueOn||e.raw?.dueOn:e.surveyCompletedOn||e.raw?.surveyCompletedOn}function De(e,t){let n=ot(e,t);if(!n)return"";let r=String(n).match(/^\d{4}-\d{2}-\d{2}/);if(r)return r[0];let o=new Date(n);return Number.isNaN(o.getTime())?"":[o.getFullYear(),String(o.getMonth()+1).padStart(2,"0"),String(o.getDate()).padStart(2,"0")].join("-")}function Fe(e){return e.map(t=>t.assessmentId)}var it=chrome.runtime.getURL("assets/encoded_data.txt");async function Be(e){let t=Array.isArray(e)?e:[],n=await lt(),s=n.worksheets[0],r=n.addWorksheet("All Assessments"),o=new Map;for(let l=0;l<t.length;l++){let d=t[l],c=_e(d),N=ft(c,l);o.set(c.assessmentId,N);let w=mt(n,s,N);dt(w,d,c)}ct(r,t,o),n.removeWorksheet(s.id),n.calcProperties.fullCalcOnLoad=!0,n.calcProperties.calcMode="auto";let i=await n.xlsx.writeBuffer();vt(i,`Risk_Profiler_Quality_List_${wt()}.xlsx`)}async function lt(){let t=(await(await fetch(it)).text()).trim(),n=Uint8Array.from(atob(t),r=>r.charCodeAt(0)),s=new ExcelJS.Workbook;return await s.xlsx.load(n.buffer),s}function ct(e,t,n){e.columns=[{header:"Open",key:"open",width:15},{header:"Assessment ID",key:"assessmentId",width:18},{header:"Application",key:"application",width:40},{header:"Asset ID",key:"assetId",width:15},{header:"Lifecycle",key:"lifecycle",width:20},{header:"Application Manager",key:"manager",width:30},{header:"Business System Owner",key:"owner",width:30},{header:"Survey Completed Date",key:"surveyCompletedDate",width:22},{header:"Attested Date",key:"attestedDate",width:22},{header:"Status",key:"status",width:15},{header:"Attested By",key:"attestedBy",width:30},{header:"Passed",key:"passed",width:12},{header:"Failed",key:"failed",width:12},{header:"N/A",key:"na",width:12},{header:"Score",key:"score",width:12},{header:"Error",key:"error",width:60}],t.forEach(s=>{let r=_e(s),o=s.summary||{},i=(s.results||[]).filter(h=>h.status==="FAIL").map(h=>`${h.id}: ${h.reason}`),l=(s.results||[]).filter(h=>h.reason==="Question identifier was not found in the survey questions.").map(h=>h.id),d=[s.error,l.length?`Missing Questions: ${l.join(", ")}`:"",i.length?i.join(" | "):""].filter(Boolean).join(" | "),c=e.addRow({open:"Open",assessmentId:r.assessmentId,application:r.assetName,assetId:r.assetId,lifecycle:r.lifeCycle,manager:r.appMgrName,owner:r.sysOwnerName,surveyCompletedDate:fe(r.surveyCompletedOn),attestedDate:fe(r.attestOn),status:r.hasIncomplete?"Incomplete":"Completed",attestedBy:r.attestName||"",passed:o.passed||0,failed:o.failed||0,na:o.na||0,score:o.score?`${o.score}%`:"",error:d}),N=n.get(r.assessmentId),w=c.getCell(1);w.value={text:"Open",hyperlink:`#'${N}'!A1`},w.font={color:{argb:"FF0563C1"},underline:!0}}),e.getRow(1).font={bold:!0}}function dt(e,t,n){e.getCell("C2").value=n.assetName||"",e.getCell("C3").value=n.assetId||"",e.getCell("C4").value=n.appMgrName||"",e.getCell("C5").value=fe(new Date);let s=ut(e);(t.results||[]).forEach(r=>{let o=s[String(r.id).toUpperCase()];if(!o)return;let i=e.getCell(`A${o}`);i.value=pt(r.status);let l=String(r.status||"").toUpperCase();l==="PASS"?(i.fill={type:"pattern",pattern:"solid",fgColor:{argb:"FF00A300"}},i.font={color:{argb:"ff000000"},bold:!0}):l==="FAIL"?(i.fill={type:"pattern",pattern:"solid",fgColor:{argb:"FFFF0000"}},i.font={color:{argb:"ff000000"},bold:!0}):l==="NA"&&(i.fill={type:"pattern",pattern:"solid",fgColor:{argb:"FFD9D9D9"}},i.font={color:{argb:"ff000000"},italic:!0}),e.getCell(`D${o}`).value=r.reason||""})}function ut(e){let t={};return e.eachRow((n,s)=>{let r=String(n.getCell(2).value||"").trim().toUpperCase();/^RP\d+$/.test(r)&&(t[r]=s)}),t}function mt(e,t,n){let s=e.addWorksheet(n);return t.properties&&(s.properties=JSON.parse(JSON.stringify(t.properties))),t.pageSetup&&(s.pageSetup=JSON.parse(JSON.stringify(t.pageSetup))),t.views&&(s.views=JSON.parse(JSON.stringify(t.views))),t.columns.forEach((r,o)=>{let i=s.getColumn(o+1);i.width=r.width,i.hidden=r.hidden,i.outlineLevel=r.outlineLevel}),t.eachRow({includeEmpty:!0},(r,o)=>{let i=s.getRow(o);i.height=r.height,i.hidden=r.hidden,i.outlineLevel=r.outlineLevel,r.eachCell({includeEmpty:!0},(l,d)=>{let c=i.getCell(d);if(typeof l.value=="object"&&l.value!==null)try{c.value=JSON.parse(JSON.stringify(l.value))}catch{c.value=l.text||""}else c.value=l.value;try{c.style=JSON.parse(JSON.stringify(l.style||{}))}catch{c.style={}}if(l.alignment)try{c.alignment=JSON.parse(JSON.stringify(l.alignment))}catch{}if(l.font)try{c.font=JSON.parse(JSON.stringify(l.font))}catch{}if(l.border)try{c.border=JSON.parse(JSON.stringify(l.border))}catch{}if(l.fill)try{c.fill=JSON.parse(JSON.stringify(l.fill))}catch{}if(l.numFmt&&(c.numFmt=l.numFmt),l.protection)try{c.protection=JSON.parse(JSON.stringify(l.protection))}catch{}})}),t.model?.merges&&t.model.merges.forEach(r=>{try{s.mergeCells(r)}catch{}}),s}function pt(e){switch(String(e||"").toUpperCase()){case"PASS":return"Yes";case"FAIL":return"No";case"NA":return"N/A";default:return""}}function _e(e){return{...e.assessment||{},assessmentId:e.assessmentId,assetName:e.assetName,...e.assessment||{}}}function ft(e,t){return(e.assetName||`Assessment ${t+1}`).replace(/[\\/?*[\]:]/g," ").trim().slice(0,31)}function fe(e){if(!e)return"";try{return new Date(e).toLocaleDateString()}catch{return e}}function wt(){let e=new Date,t=n=>String(n).padStart(2,"0");return`${e.getFullYear()}${t(e.getMonth()+1)}${t(e.getDate())}_${t(e.getHours())}${t(e.getMinutes())}${t(e.getSeconds())}`}function vt(e,t){let n=new Blob([e],{type:"application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"}),s=URL.createObjectURL(n),r=document.createElement("a");r.href=s,r.download=t,r.click(),setTimeout(()=>URL.revokeObjectURL(s),1e3)}var he="http://schemas.openxmlformats.org/wordprocessingml/2006/main",ht="http://schemas.microsoft.com/office/word/2010/wordml",gt="http://schemas.openxmlformats.org/markup-compatibility/2006",yt=`<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types">
    <Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/>
    <Default Extension="xml" ContentType="application/xml"/>
    <Override PartName="/word/document.xml" ContentType="application/vnd.openxmlformats-officedocument.wordprocessingml.document.main+xml"/>
    <Override PartName="/word/styles.xml" ContentType="application/vnd.openxmlformats-officedocument.wordprocessingml.styles+xml"/>
    <Override PartName="/word/settings.xml" ContentType="application/vnd.openxmlformats-officedocument.wordprocessingml.settings+xml"/>
</Types>`,St=`<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">
    <Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/officeDocument" Target="word/document.xml"/>
</Relationships>`,At=`<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships"/>`,bt=`<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<w:styles xmlns:w="${he}">
    <w:style w:type="paragraph" w:default="1" w:styleId="Normal">
        <w:name w:val="Normal"/>
        <w:qFormat/>
        <w:rPr>
            <w:rFonts w:ascii="Aptos" w:hAnsi="Aptos"/>
            <w:sz w:val="22"/>
            <w:szCs w:val="22"/>
        </w:rPr>
    </w:style>
    <w:style w:type="paragraph" w:styleId="Title">
        <w:name w:val="Title"/>
        <w:basedOn w:val="Normal"/>
        <w:qFormat/>
        <w:rPr>
            <w:b/>
            <w:color w:val="1F2937"/>
            <w:sz w:val="32"/>
        </w:rPr>
    </w:style>
    <w:style w:type="paragraph" w:styleId="Heading1">
        <w:name w:val="heading 1"/>
        <w:basedOn w:val="Normal"/>
        <w:qFormat/>
        <w:rPr>
            <w:b/>
            <w:color w:val="315FD6"/>
            <w:sz w:val="26"/>
        </w:rPr>
    </w:style>
</w:styles>`,Et=`<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<w:settings xmlns:w="${he}">
    <w:updateFields w:val="true"/>
</w:settings>`,Pe=new TextEncoder,Tt=Mt();async function qe(e){let t=new Blob([Nt(e)],{type:"application/vnd.openxmlformats-officedocument.wordprocessingml.document"}),n=URL.createObjectURL(t),s=document.createElement("a");s.href=n,s.download=`${Pt(e?.assetName||"application")}_RISK-PRofiler_review_notes.docx`,s.click(),URL.revokeObjectURL(n)}function Nt(e){return Dt([{name:"[Content_Types].xml",content:yt},{name:"_rels/.rels",content:St},{name:"word/document.xml",content:xt(e)},{name:"word/_rels/document.xml.rels",content:At},{name:"word/styles.xml",content:bt},{name:"word/settings.xml",content:Et}])}function xt(e){let t=e?.contacts||[],n=[T([g(`${e?.assetName||"Application"} Risk Profiler Review Notes`,{bold:!0})],{style:"Title",spacingAfter:260}),T([g("Application Details",{bold:!0})],{style:"Heading1"}),Rt([["Application Name",e?.assetName||"N/A"],["Due Date",Ue(e?.dueOn)||"N/A"],["Survey Completed On",Ue(e?.surveyCompletedOn)||"N/A"],["Review Assessment Date",_t(e?.reviewedAt)||"N/A"]]),T([g("Contacts",{bold:!0})],{style:"Heading1",spacingBefore:180}),Ct(t),T([g("Review Output",{bold:!0})],{style:"Heading1",spacingBefore:220}),Lt(e?.workQueue||[])].join("");return`<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<w:document
    xmlns:w="${he}"
    xmlns:w14="${ht}"
    xmlns:mc="${gt}"
    mc:Ignorable="w14">
    <w:body>
        ${n}
        <w:sectPr>
            <w:pgSz w:w="12240" w:h="15840"/>
            <w:pgMar w:top="720" w:right="720" w:bottom="720" w:left="720" w:header="360" w:footer="360" w:gutter="0"/>
        </w:sectPr>
    </w:body>
</w:document>`}function Ct(e){if(e.length===0)return T([g("No Application Manager or Business System Manager details were found.")]);let t=[le([I("Contact Type",{bold:!0,fill:"E8EEFC"}),I("Name",{bold:!0,fill:"E8EEFC"}),I("Identity ID",{bold:!0,fill:"E8EEFC"}),I("Email",{bold:!0,fill:"E8EEFC"})]),...e.map(n=>le([I(n.contactType||"N/A"),I(n.associatedTo||"N/A"),I(n.associatedToIdentityId||"N/A"),I(n.email||"N/A")]))];return ge(t)}function Rt(e){return ge(e.map(([t,n])=>le([I(t,{bold:!0,fill:"F3F4F6"}),I(n)])))}function Lt(e){return e.length===0?T([g("No reachable unanswered work queue items were found.")]):e.map((t,n)=>[t.status?T([g(t.status,{bold:!0,color:"315FD6"})],{spacingBefore:n===0?80:180,spacingAfter:80}):"",Ot(t.questionGroup||"N/A",t.questionId||"N/A"),we("Question",t.question||"N/A"),we("Answer Type",t.answerType||"N/A"),t.asaNotes?we("ASA Notes",t.asaNotes):"",T([g("Options",{bold:!0})]),...It(t.options||[]),kt()].join("")).join("")}function It(e){return(e.length?e:[{index:1,internalValue:"<no options>"}]).map(n=>T([$t(),g(` ${n.index||""}. ${n.internalValue||n.displayValue||"<no options>"}`)],{indentLeft:360,spacingAfter:70}))}function Ot(e,t){return ge([le([ve([g("Category: ",{bold:!0}),g(e)]),ve([g("Question ID: ",{bold:!0}),g(t)],{align:"right"})])],{noBorders:!0})}function we(e,t){return T([g(`${e}: `,{bold:!0}),g(t)])}function $t(){return`
        <w:sdt>
            <w:sdtPr>
                <w:id w:val="${Math.floor(Math.random()*1e9)}"/>
                <w14:checkbox>
                    <w14:checked w14:val="0"/>
                    <w14:checkedState w14:val="2612" w14:font="Segoe UI Symbol"/>
                    <w14:uncheckedState w14:val="2610" w14:font="Segoe UI Symbol"/>
                </w14:checkbox>
            </w:sdtPr>
            <w:sdtContent>
                <w:r>
                    <w:rPr>
                        <w:rFonts w:ascii="Segoe UI Symbol" w:hAnsi="Segoe UI Symbol"/>
                        <w:sz w:val="22"/>
                    </w:rPr>
                    <w:t>\u2610</w:t>
                </w:r>
            </w:sdtContent>
        </w:sdt>`}function kt(){return T([],{borderBottom:!0,spacingBefore:80,spacingAfter:140})}function T(e,t={}){let n=[];return t.style&&n.push(`<w:pStyle w:val="${Ve(t.style)}"/>`),t.align&&n.push(`<w:jc w:val="${t.align}"/>`),(t.spacingBefore||t.spacingAfter)&&n.push(`<w:spacing w:before="${t.spacingBefore||0}" w:after="${t.spacingAfter||0}"/>`),t.indentLeft&&n.push(`<w:ind w:left="${t.indentLeft}"/>`),t.borderBottom&&n.push('<w:pBdr><w:bottom w:val="single" w:sz="6" w:space="1" w:color="CBD5E1"/></w:pBdr>'),`<w:p>${n.length?`<w:pPr>${n.join("")}</w:pPr>`:""}${e.join("")}</w:p>`}function g(e,t={}){let n=[];return t.bold&&n.push("<w:b/>"),t.color&&n.push(`<w:color w:val="${t.color}"/>`),`<w:r>${n.length?`<w:rPr>${n.join("")}</w:rPr>`:""}<w:t xml:space="preserve">${Ve(e)}</w:t></w:r>`}function ge(e,t={}){return`<w:tbl>
        <w:tblPr>
            <w:tblW w:w="5000" w:type="pct"/>
            ${t.noBorders?`<w:tblBorders>
                <w:top w:val="nil"/><w:left w:val="nil"/><w:bottom w:val="nil"/><w:right w:val="nil"/><w:insideH w:val="nil"/><w:insideV w:val="nil"/>
            </w:tblBorders>`:`<w:tblBorders>
                <w:top w:val="single" w:sz="6" w:space="0" w:color="9CA3AF"/>
                <w:left w:val="single" w:sz="6" w:space="0" w:color="9CA3AF"/>
                <w:bottom w:val="single" w:sz="6" w:space="0" w:color="9CA3AF"/>
                <w:right w:val="single" w:sz="6" w:space="0" w:color="9CA3AF"/>
                <w:insideH w:val="single" w:sz="6" w:space="0" w:color="9CA3AF"/>
                <w:insideV w:val="single" w:sz="6" w:space="0" w:color="9CA3AF"/>
            </w:tblBorders>`}
        </w:tblPr>
        ${e.join("")}
    </w:tbl>`}function le(e){return`<w:tr>${e.join("")}</w:tr>`}function I(e,t={}){return ve([g(e||"",{bold:t.bold})],t)}function ve(e,t={}){let n=['<w:tcW w:w="2500" w:type="pct"/>','<w:tcMar><w:top w:w="80" w:type="dxa"/><w:left w:w="80" w:type="dxa"/><w:bottom w:w="80" w:type="dxa"/><w:right w:w="80" w:type="dxa"/></w:tcMar>'];return t.fill&&n.push(`<w:shd w:fill="${t.fill}"/>`),`<w:tc><w:tcPr>${n.join("")}</w:tcPr>${T(e,{align:t.align})}</w:tc>`}function Dt(e){let t=0,n=[],s=[];e.forEach(i=>{let l=Pe.encode(i.name),d=Pe.encode(i.content),c=Ft(d);n.push(A(67324752),p(20),p(0),p(0),p(0),p(0),A(c),A(d.length),A(d.length),p(l.length),p(0),l,d),s.push(A(33639248),p(20),p(20),p(0),p(0),p(0),p(0),A(c),A(d.length),A(d.length),p(l.length),p(0),p(0),p(0),p(0),A(0),A(t),l),t+=30+l.length+d.length});let r=Qe(s),o=[A(101010256),p(0),p(0),p(e.length),p(e.length),A(r),A(t),p(0)];return Bt([...n,...s,...o])}function Mt(){let e=[];for(let t=0;t<256;t+=1){let n=t;for(let s=0;s<8;s+=1)n=n&1?3988292384^n>>>1:n>>>1;e[t]=n>>>0}return e}function Ft(e){let t=4294967295;for(let n of e)t=Tt[(t^n)&255]^t>>>8;return(t^4294967295)>>>0}function p(e){let t=new Uint8Array(2);return new DataView(t.buffer).setUint16(0,e,!0),t}function A(e){let t=new Uint8Array(4);return new DataView(t.buffer).setUint32(0,e>>>0,!0),t}function Bt(e){let t=Qe(e),n=new Uint8Array(t),s=0;return e.forEach(r=>{n.set(r,s),s+=r.length}),n}function Qe(e){return e.reduce((t,n)=>t+n.length,0)}function Ve(e){return String(e??"").replace(/&/g,"&amp;").replace(/</g,"&lt;").replace(/>/g,"&gt;").replace(/"/g,"&quot;").replace(/'/g,"&apos;")}function Ue(e){if(!e)return"";let t=new Date(e);return Number.isNaN(t.getTime())?String(e):t.toLocaleDateString(void 0,{year:"numeric",month:"short",day:"2-digit"})}function _t(e){if(!e)return"";let t=new Date(e);return Number.isNaN(t.getTime())?String(e):t.toLocaleString(void 0,{year:"numeric",month:"short",day:"2-digit",hour:"2-digit",minute:"2-digit"})}function Pt(e){return String(e).trim().replace(/[\\/:*?"<>|]+/g,"_").replace(/\s+/g,"_").replace(/^_+|_+$/g,"")||"application"}function ye(e,t){let n=e;return Object.entries(t).forEach(([s,r])=>{n=n.replace(`{${s}}`,r)}),n}var ee=new Map,Ut="https://esats.web.boeing.com",qt="service-gateway.tas-phx.apps.boeing.com",Qt="https://gtc-ecm.web.boeing.com",Vt="termbank.web.boeing.com",Ht={retries:3,retryDelay:1e3,useCache:!0};function Gt(e){return new Promise(t=>setTimeout(t,e))}function jt(e){try{return new URL(e).hostname===qt}catch{return!1}}function Kt(e){try{return new URL(e).hostname===Vt}catch{return!1}}function Yt(){return typeof chrome<"u"&&chrome.tabs&&chrome.scripting}function Wt(e){return new Promise(t=>{chrome.tabs.query(e,t)})}async function Jt(e){let t=await Wt({url:`${e}/*`});return t.find(n=>n.id&&n.status==="complete")||t.find(n=>n.id)}function zt(e){return new Promise((t,n)=>{chrome.scripting.executeScript(e,s=>{let r=chrome.runtime.lastError;if(r){n(new Error(r.message));return}t(s)})})}async function He(e,{pageOrigin:t,label:n,useBearerToken:s}){if(!Yt())throw new Error(`${n} requests require the Chrome scripting permission.`);let r=await Jt(t);if(!r)throw new Error(`Open ${n} in this browser and sign in before running ${n} validation requests.`);let i=(await zt({target:{tabId:r.id},world:"MAIN",args:[e,s,t],func:async(l,d,c)=>{function N(L){if(!L)return null;let S=String(L).trim();S.startsWith("Bearer ")&&(S=S.slice(7).trim());try{let m=JSON.parse(S);typeof m=="string"?S=m.trim():m&&typeof m=="object"&&(S=m.esatsToken||m.access_token||m.token||m.value||S)}catch{}return S||null}let w=d?N(localStorage.getItem("esatsToken")):null,h={Accept:"application/json, text/plain, */*"};d&&w&&(h.Authorization=`Bearer ${w}`);try{let m=null,H=null;for(let K=1;K<=3;K++){try{if(m=await fetch(l,{method:"GET",headers:h,credentials:"omit",cache:"no-store",referrer:`${c}/`,referrerPolicy:"strict-origin-when-cross-origin"}),m.ok)break;H=new Error(`${m.status} ${m.statusText}`)}catch(x){H=x}K<3&&await new Promise(x=>setTimeout(x,1e3))}if(!m||!m.ok)throw H||new Error("Request failed");let G=await m.text(),j=null;if(G)try{j=JSON.parse(G)}catch{j=G}return{ok:m.ok,status:m.status,statusText:m.statusText,url:m.url,hasAuthorization:d?!!w:!0,data:j}}catch(L){return console.log("ESATS token:",w),console.log("Request URL:",l),console.log("Headers:",h),{ok:!1,status:0,statusText:L.message||"Request failed",hasAuthorization:d?!!w:!0,error:L.message}}}}))?.[0]?.result;if(!i)throw new Error(`${n} request did not return a response.`);if(!i.ok){let l=i.hasAuthorization?"":" No ESATS bearer token was found in the ESATS tab.";throw new Error(`${n} request failed: ${i.status} ${i.statusText}.${l}`)}return i.data}async function Xt(e){return He(e,{pageOrigin:Ut,label:"ESATS",useBearerToken:!0})}async function Zt(e){return He(e,{pageOrigin:Qt,label:"GTC",useBearerToken:!1})}async function ce(e,t={}){let n={...Ht,...t};if(n.useCache&&ee.has(e))return ee.get(e);let s;for(let r=1;r<=n.retries;r++)try{if(jt(e)){let l=await Xt(e);return n.useCache&&ee.set(e,l),l}if(Kt(e)){let l=await Zt(e);return n.useCache&&ee.set(e,l),l}let o=await fetch(e,{credentials:"include",headers:{Accept:"application/json, text/plain, */*"},cache:"no-store"});if(!o.ok)throw new Error(`${o.status} ${o.statusText}`);let i=await o.json();return n.useCache&&ee.set(e,i),i}catch(o){s=o,r<n.retries&&await Gt(n.retryDelay)}throw s}async function Se(e){if(!e)return[];let t=ye(Z.SURVEY_TEMPLATE_QUESTIONS,{id:e});return ce(t)}async function Ae(e){if(!e)return null;let t=ye(Z.SURVEY_TEMPLATE_DETAIL,{id:e});return ce(t)}async function Ge(){return ce(Z.SURVEY_TEMPLATES_RP_APP,{useCache:!1})}function je(e){let t=new Map;for(let n of e)n.alternateQuestionId&&t.set(n.alternateQuestionId,n);return t}async function Ke(e,t){if(!e||!t)throw new Error("Both survey template IDs are required.");if(Number(e)===Number(t))return{metadata:{fromId:Number(e),toId:Number(t)},newQuestions:[],removedQuestions:[],modifiedQuestions:[]};let[n,s,r,o]=await Promise.all([Ae(e),Se(e),Ae(t),Se(t)]);if(!n||!r)throw new Error("Unable to load one or both survey template details.");let i=je(s||[]),l=je(o||[]),d=new Set([...i.keys(),...l.keys()]),c=Array.from(d).sort(),N={metadata:{fromId:Number(e),fromVersionNumber:n.versionNumber,fromUpdatedOn:n.updatedOn,fromReleasedOn:n.releasedOn,toId:Number(t),toVersionNumber:r.versionNumber,toUpdatedOn:r.updatedOn,toReleasedOn:r.releasedOn},newQuestions:[],removedQuestions:[],modifiedQuestions:[]};for(let w of c)if(!i.has(w))N.newQuestions.push({alternateQuestionId:w,questionText:l.get(w).questionText});else if(!l.has(w))N.removedQuestions.push({alternateQuestionId:w,questionText:i.get(w).questionText});else{let h=i.get(w),L=l.get(w),S=!1,m={alternateQuestionId:w};h.questionText!==L.questionText&&(m.textChanged={old:h.questionText,new:L.questionText},S=!0);let H=new Set((h.options||[]).map(x=>x.displayValue)),G=new Set((L.options||[]).map(x=>x.displayValue)),j=[...G].filter(x=>!H.has(x)),K=[...H].filter(x=>!G.has(x));(j.length>0||K.length>0)&&(m.optionsChanged={added:j,removed:K},S=!0),S&&N.modifiedQuestions.push(m)}return N}var P=[],k=[],de=[],$=[],b=[],R=[],J=!1,ne=!1,O="validation",u=null,B={},W={},C=[],f=null,v=null,te=0,a=e=>document.getElementById(e);document.addEventListener("DOMContentLoaded",en);async function en(){await We(),await vn(),nn(),await Rn(),st(),pn(),In(),Fn()}async function We(){P=await Ie(),k=[...P],tn(),re()}function tn(){a("ownerFilter")&&(de=[...new Set(P.map(t=>t.appMgrName))].filter(Boolean).sort(),Je(de))}function Je(e){let t=a("ownerFilter");if(!t)return;let n=t.value;t.innerHTML="";let s=document.createElement("option");s.value="",s.textContent="All Application Managers",t.appendChild(s),e.forEach(r=>{let o=document.createElement("option");o.value=r,o.textContent=r,t.appendChild(o)}),n&&e.includes(n)&&(t.value=n)}function ze(){let e=a("ownerSearchInput")?.value?.trim()||"";if(!e)return null;try{return new RegExp(e,"i")}catch{return null}}function Xe(){let e=ze(),t=e?de.filter(n=>e.test(n)):de;Je(t)}function nn(){a("searchInput")?.addEventListener("input",F),a("regexMode")?.addEventListener("change",F),a("fromDate")?.addEventListener("change",F),a("toDate")?.addEventListener("change",F),a("dateFilterField")?.addEventListener("change",F),a("assessmentStatusFilter")?.addEventListener("change",F),a("ownerSearchInput")?.addEventListener("input",()=>{Xe(),F()}),a("ownerFilter")?.addEventListener("change",F),a("clearFiltersBtn")?.addEventListener("click",sn),a("refreshBtn")?.addEventListener("click",dn),a("checkPrereqBtn")?.addEventListener("click",st),a("selectAllBtn")?.addEventListener("click",ln),a("clearSelectionBtn")?.addEventListener("click",cn),a("validateBtn")?.addEventListener("click",un),a("reviewBtn")?.addEventListener("click",mn),a("cancelBtn")?.addEventListener("click",async()=>{await chrome.runtime.sendMessage({action:"STOP_VALIDATION"})}),a("cancelReviewBtn")?.addEventListener("click",async()=>{await chrome.runtime.sendMessage({action:"STOP_REVIEW"})}),a("retryFailedBtn")?.addEventListener("click",kn),a("clearResultsBtn")?.addEventListener("click",On),a("clearReviewResultsBtn")?.addEventListener("click",$n),a("exportBtn")?.addEventListener("click",Mn),a("validationTabBtn")?.addEventListener("click",()=>U("validation")),a("reviewTabBtn")?.addEventListener("click",()=>U("review")),a("closeReviewNotesModalBtn")?.addEventListener("click",Ee),a("reviewNotesModal")?.addEventListener("click",e=>{e.target===a("reviewNotesModal")&&Ee()}),a("copyReviewNotesBtn")?.addEventListener("click",xn),a("selectAllReviewNotesBtn")?.addEventListener("click",bn),a("downloadReviewNotesBtn")?.addEventListener("click",fn),Cn()}function F(){let e={search:a("searchInput")?.value||"",regexMode:a("regexMode")?.checked||!1,fromDate:a("fromDate")?.value||"",toDate:a("toDate")?.value||"",dateFilterField:a("dateFilterField")?.value||"surveyCompletedOn",assessmentStatus:a("assessmentStatusFilter")?.value||""};k=Me(P,e);let t=ze();t&&(k=k.filter(s=>t.test(s.appMgrName||"")));let n=a("ownerFilter")?.value;n&&(k=k.filter(s=>s.appMgrName===n)),re()}function sn(){a("searchInput").value="",a("regexMode").checked=!1,a("fromDate").value="",a("toDate").value="",a("dateFilterField").value="surveyCompletedOn",a("assessmentStatusFilter").value="",a("ownerSearchInput").value="",a("ownerFilter").value="",Xe(),k=[...P],re()}function re(){let e=a("assessmentList");e.innerHTML="",k.forEach(t=>{let n=rn(t),s=document.createElement("div");s.className=`assessment-row ${n.className}`,s.innerHTML=`

                <input
                    type="checkbox"
                    class="assessment-checkbox"
                    data-id="${t.assessmentId}"
                    ${$.includes(t.assessmentId)?"checked":""}
                >

                <div class="assessment-meta">

                    <div class="asset-name">

                        ${t.assetName}

                        <span class="status-pill ${n.className}">
                            ${n.label}
                        </span>

                    </div>

                    <div class="asset-sub">

                        ID:
                        ${t.assessmentId}

                        \u2022

                        ${t.lifeCycle}

                        \u2022

                        ${t.appMgrName||"N/A"}

                    </div>

                    <div class="asset-sub date-info">
                        ${an(t)}
                    </div>

                    <div class="asset-sub status-detail">

                        ${n.detail}

                    </div>

                </div>

            `,e.appendChild(s)}),on(),Ze()}function an(e){let t=_(e.dueOn||e.raw?.dueOn)||"N/A";return ie(e)?`<strong>Incomplete initiated date:</strong> ${_(e.incompleteInitiatedOn||e.raw?.incompleteInitiatedOn)||"N/A"} \u2022 <strong>Due on:</strong> ${t}`:`<strong>Due on:</strong> ${t}`}function rn(e){if(ie(e)){let r=e.incompleteInitiatedByName||e.raw?.incompleteInitiatedByName||"N/A",o=e.incompleteInitiatedOn||e.raw?.incompleteInitiatedOn;return{label:"Incomplete",className:"status-incomplete",detail:`Incomplete mark \u2022 Initiated by ${r}${o?` \u2022 ${_(o)}`:""}`}}let n=e.attestName||e.raw?.attestName||"N/A",s=e.attestOn||e.raw?.attestOn;return{label:"Completed",className:"status-completed",detail:`Attested by ${n}${s?` \u2022 ${_(s)}`:""}`}}function _(e){if(!e)return"";let t=new Date(e);return Number.isNaN(t.getTime())?e:t.toLocaleDateString(void 0,{year:"numeric",month:"short",day:"2-digit"})}function on(){document.querySelectorAll(".assessment-checkbox").forEach(e=>{e.addEventListener("change",t=>{let n=Number(t.target.dataset.id);t.target.checked?$.includes(n)||$.push(n):$=$.filter(s=>s!==n),Ze()})})}function Ze(){a("selectedCount").textContent=`${$.length} Selected`}function ln(){$=Fe(k),re()}function cn(){$=[],re()}async function dn(){a("refreshBtn").disabled=!0;try{await chrome.runtime.sendMessage({action:"REFRESH_ASSESSMENTS"}),await We()}finally{a("refreshBtn").disabled=!1}}async function un(){let e=P.filter(t=>$.includes(t.assessmentId));if(e.length===0){alert("Select at least one assessment.");return}J=!1,U("validation"),a("progressContainer")?.classList.remove("hidden"),a("cancelBtn")?.classList.remove("hidden"),a("cancelReviewBtn")?.classList.add("hidden"),a("retryFailedBtn")?.classList.add("hidden"),await chrome.runtime.sendMessage({action:"START_VALIDATION",assessments:e})}async function mn(){let e=P.filter(t=>$.includes(t.assessmentId));if(e.length===0){alert("Select at least one assessment.");return}ne=!1,U("review"),a("progressContainer")?.classList.remove("hidden"),Y({completed:0,total:e.length,current:"Starting review",startedAt:Date.now(),type:"review"}),a("cancelReviewBtn")?.classList.remove("hidden"),a("cancelBtn")?.classList.add("hidden"),a("retryFailedBtn")?.classList.add("hidden"),a("reviewBtn").disabled=!0,await chrome.runtime.sendMessage({action:"START_REVIEW",assessments:e})}function pn(){setInterval(async()=>{let e=await chrome.storage.local.get(["validationProgress","validationComplete","validationResults","validationError","reviewProgress","reviewComplete","reviewResults","reviewError",E.STORAGE_KEYS.LAST_ACTION]),t=e[E.STORAGE_KEYS.LAST_ACTION]||O;t==="validation"&&e.validationProgress&&!e.validationComplete&&Y(e.validationProgress,"validation"),e.validationComplete&&!J&&(b=e.validationResults||[],xe(b),J=!0,U("validation"),a("exportBtn")?.classList.remove("hidden"),a("clearResultsBtn")?.classList.remove("hidden"),a("cancelBtn")?.classList.add("hidden"),Y(e.validationProgress,"validation"),(await oe()).length?a("retryFailedBtn")?.classList.remove("hidden"):a("retryFailedBtn")?.classList.add("hidden")),t==="review"&&e.reviewProgress&&!e.reviewComplete&&Y(e.reviewProgress,"review"),e.reviewComplete&&!ne&&(R=e.reviewResults||[],ue(R),ne=!0,U("review"),a("reviewBtn").disabled=!1,Y(e.reviewProgress,"review"),a("cancelReviewBtn")?.classList.add("hidden"),a("clearReviewResultsBtn")?.classList.remove("hidden")),t==="validation"&&e.validationError&&!e.validationProgress&&(a("cancelBtn")?.classList.add("hidden"),a("progressText").textContent=e.validationError),e.reviewError&&(a("reviewBtn").disabled=!1,a("cancelReviewBtn")?.classList.add("hidden"))},1e3)}function Y(e,t=O){if(!e||!e.total)return;let n=Math.round(e.completed/e.total*100),s=e.completedAt||Date.now(),r=e.startedAt||s,o=Math.max(0,s-r),i=e.completed>=e.total,l=!i&&e.completed>0?be(Math.max(0,o/e.completed*(e.total-e.completed))):i?"Complete":"Calculating",d=t==="review"?"Review":"Validation",c=e.current&&!String(e.current).toLowerCase().includes("completed")?` \u2022 Current: ${e.current}`:"";a("progressText").textContent=i?`${d} complete: ${e.completed}/${e.total} processed \u2022 Time Elapsed: ${be(o)} \u2022 Estimated Time: Complete`:`${d} in progress: ${e.completed}/${e.total} processed${c} \u2022 Time Elapsed: ${be(o)} \u2022 Estimated Time: ${l}`,a("progressFill").style.width=`${n}%`}function be(e){let t=Math.max(0,Math.round(e/1e3));if(t<60)return`${t}s`;let n=Math.floor(t/60),s=t%60;return`${n}m ${s}s`}function U(e){O=e==="review"?"review":"validation",a("validationTabBtn")?.classList.toggle("active",O==="validation"),a("reviewTabBtn")?.classList.toggle("active",O==="review"),a("resultsContainer")?.classList.toggle("hidden",O!=="validation"),a("reviewResultsContainer")?.classList.toggle("hidden",O!=="review"),q()}function q(){let e=b&&b.length>0,t=R&&R.length>0;a("exportBtn")?.classList.toggle("hidden",O!=="validation"||!e),a("clearResultsBtn")?.classList.toggle("hidden",O!=="validation"||!e),a("clearReviewResultsBtn")?.classList.toggle("hidden",O!=="review"||!t)}function xe(e){let t=a("validationCardsContainer");if(t.innerHTML="",!e||e.length===0){q();return}e.forEach(n=>{let s=document.createElement("div");s.className="result-card";let r=n.results&&n.results.some(l=>l.reason==="Question identifier was not found in the survey questions."),o=n.summary?n.summary.score:null,i=o!==null&&o<90;s.innerHTML=`

                <div class="result-header">

                    <strong>

                        ${n.assetName}

                    </strong>

                    <div style="display: flex; align-items: center; gap: 8px;">
                        ${r?'<span class="score-error-indicator" title="Question identifier was not found in the survey questions.">! Error</span>':""}
                        <span class="score-pill ${i?"score-low":""}">
                            ${n.summary?`${o}%`:"Error"}
                        </span>
                    </div>

                </div>

                <div class="result-meta">

                    ${n.error?n.error:`
                    PASS:
                    ${n.summary.passed}

                    |

                    FAIL:
                    ${n.summary.failed}

                    |

                    N/A:
                    ${n.summary.na}
                    `}

                </div>

                ${n.error?"":`
                <details>

                    <summary>
                        Checkpoints
                    </summary>

                    <div class="checkpoint-results">

                        <div class="checkpoint-results-header">
                            <span>Checkpoint Details</span>
                            <button
                                class="download-context download-context-btn"
                                data-id="${n.assessmentId}"
                                title="Download Context"
                                aria-label="Download Context"
                            >
                                <svg viewBox="0 0 24 24" width="16" height="16" stroke="currentColor" stroke-width="2.5" fill="none" stroke-linecap="round" stroke-linejoin="round">
                                    <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"></path>
                                    <polyline points="7 10 12 15 17 10"></polyline>
                                    <line x1="12" y1="15" x2="12" y2="3"></line>
                                </svg>
                            </button>
                        </div>

                        ${n.results.map(l=>`

                            <div${l.reason==="Question identifier was not found in the survey questions."?' class="rule-error-missing"':""}>

                                <strong>
                                    ${l.id}
                                </strong>

                                :

                                ${l.status}

                                <br>

                                <small>
                                    ${l.reason}
                                </small>

                            </div>

                            <hr>
                        `).join("")}

                    </div>

                </details>
                    `}
            `,t.appendChild(s)}),document.querySelectorAll(".download-context").forEach(n=>{n.addEventListener("click",()=>{Dn(n.dataset.id)})}),q()}function ue(e){let t=a("reviewCardsContainer");if(t.innerHTML="",!e||e.length===0){t.innerHTML='<div class="review-empty">No review results yet.</div>',q();return}e.forEach(n=>{let s=document.createElement("div"),r=n.status==="Incomplete"?"status-incomplete":"status-completed";s.className=`review-card ${r}`;let o=n.status==="Incomplete"?`
                        <div><strong>Incomplete Initiated On:</strong> ${n.incompleteInitiatedOnFormatted||"N/A"}</div>
                        <div><strong>Due On:</strong> ${n.dueOnFormatted||"N/A"}</div>
                    `:`
                        <div><strong>Due On:</strong> ${n.dueOnFormatted||"N/A"}</div>
                    `;s.innerHTML=`
                <div class="review-card-header">
                    <div class="review-card-title">
                        ${n.assetName||"Unknown Assessment"}
                        <span>Assessment ID: ${n.assessmentId||"N/A"}</span>
                    </div>
                    <span class="status-pill ${r}">
                        ${n.status||"Completed"}
                    </span>
                </div>
                <div class="review-card-meta">
                    ${o}
                    <div><strong>Review Items:</strong> ${n.workQueue?n.workQueue.length:0}</div>
                </div>
                ${n.error?`<div class="review-error">${n.error}</div>`:`<div class="review-card-actions">
                        <button
                            class="btn-secondary review-notes-btn"
                            data-id="${n.assessmentId}"
                        >
                            Review Notes
                        </button>
                    </div>`}
            `,t.appendChild(s)}),document.querySelectorAll(".review-notes-btn").forEach(n=>{n.addEventListener("click",()=>wn(n.dataset.id))}),q()}async function fn(){if(!u||u.error)return;let e=et(u);e.length!==0&&await qe({...u,workQueue:e})}function wn(e){let t=R.find(n=>String(n.assessmentId)===String(e));!t||t.error||(u=t,a("reviewNotesTitle").textContent=t.assetName||"Review Notes",a("reviewNotesMeta").innerHTML=t.notesMetaHtml||"",gn(t),Ce(),a("reviewNotesModal")?.classList.remove("hidden"))}function Ee(){a("reviewNotesModal")?.classList.add("hidden"),u=null}async function vn(){W=(await chrome.storage.local.get("reviewQuestionNotes")).reviewQuestionNotes||{}}async function hn(){await chrome.storage.local.set({reviewQuestionNotes:W})}function gn(e){let t=V(e);B[t]||(B[t]=(e.workQueue||[]).map((n,s)=>X(n,s)))}function Ce(){let e=a("reviewNotesContent");if(!e||!u)return;let t=u.workQueue||[];if(t.length===0){e.innerHTML='<div class="review-output-empty">No reachable unanswered work queue items were found.</div>',Te();return}let n=V(u),s=new Set(B[n]||[]);e.innerHTML=t.map((r,o)=>yn(r,o,s.has(X(r,o)))).join(""),Sn(),Te()}function yn(e,t,n){let s=X(e,t),r=tt(u,e,t),o=(e.options||[]).length?(e.options||[]).map(i=>`<li>${y(Nn(i))}</li>`).join(""):"<li>&lt;no options&gt;</li>";return`
        <section class="review-output-item" data-question-key="${y(s)}">
            <div class="review-question-toolbar">
                <label class="review-question-select">
                    <input
                        type="checkbox"
                        class="review-question-checkbox"
                        data-key="${y(s)}"
                        ${n?"checked":""}
                    >
                    <span>Select for download</span>
                </label>
                <button
                    type="button"
                    class="review-note-icon-btn"
                    data-key="${y(s)}"
                    title="ASA Notes"
                    aria-label="ASA Notes"
                >
                    <svg viewBox="0 0 24 24" width="16" height="16" stroke="currentColor" stroke-width="2.2" fill="none" stroke-linecap="round" stroke-linejoin="round">
                        <path d="M12 20h9"></path>
                        <path d="M16.5 3.5a2.1 2.1 0 0 1 3 3L7 19l-4 1 1-4Z"></path>
                    </svg>
                </button>
            </div>
            ${e.status?`<div class="review-output-status">${y(e.status)}</div>`:""}
            <div class="review-output-id-row">
                <div><strong>Category:</strong> <span>${y(e.questionGroup||"N/A")}</span></div>
                <div><strong>Question ID:</strong> <span>${y(e.questionId||"N/A")}</span></div>
            </div>
            <div class="review-output-field">
                <strong>Question:</strong>
                <span>${y(e.question||"N/A")}</span>
            </div>
            <div class="review-output-field">
                <strong>Answer Type:</strong>
                <span>${y(e.answerType||"N/A")}</span>
            </div>
            <div class="review-output-field">
                <strong>Options:</strong>
                <ul>${o}</ul>
            </div>
            <div class="review-asa-note ${r?"":"hidden"}" data-note-preview="${y(s)}">
                <strong>ASA Notes:</strong>
                <span>${y(r)}</span>
            </div>
            <div class="review-note-editor hidden" data-note-editor="${y(s)}">
                <textarea
                    class="review-note-input"
                    data-note-input="${y(s)}"
                    placeholder="Write ASA notes for this question..."
                >${y(r)}</textarea>
                <button
                    type="button"
                    class="btn-secondary review-note-save-btn"
                    data-key="${y(s)}"
                >
                    Save Notes
                </button>
            </div>
        </section>
    `}function Sn(){document.querySelectorAll(".review-question-checkbox").forEach(e=>{e.addEventListener("change",()=>{An(e.dataset.key,e.checked),Te()})}),document.querySelectorAll(".review-note-icon-btn").forEach(e=>{e.addEventListener("click",()=>En(e.dataset.key))}),document.querySelectorAll(".review-note-save-btn").forEach(e=>{e.addEventListener("click",()=>Tn(e.dataset.key))})}function An(e,t){let n=V(u),s=new Set(B[n]||[]);t?s.add(e):s.delete(e),B[n]=[...s]}function bn(){if(!u)return;let e=V(u),t=(u.workQueue||[]).map((s,r)=>X(s,r)),n=B[e]||[];B[e]=n.length===t.length?[]:t,Ce()}function Te(){let e=a("downloadReviewNotesBtn"),t=a("selectAllReviewNotesBtn");if(!e||!u)return;let n=(u.workQueue||[]).length,s=et(u).length;e.textContent=`Download Review Notes (${s}/${n})`,e.disabled=s===0,t&&(t.textContent=s===n&&n>0?"Deselect All":"Select All",t.disabled=n===0)}function et(e){let t=V(e),n=new Set(B[t]||[]);return(e.workQueue||[]).map((s,r)=>({item:s,index:r,key:X(s,r)})).filter(s=>n.has(s.key)).map(s=>({...s.item,asaNotes:tt(e,s.item,s.index)}))}function En(e){document.querySelector(`[data-note-editor="${nt(e)}"]`)?.classList.toggle("hidden")}async function Tn(e){let n=document.querySelector(`[data-note-input="${nt(e)}"]`)?.value.trim()||"",s=V(u);W[s]||(W[s]={}),W[s][e]=n,await hn(),Ce()}function tt(e,t,n){let s=V(e),r=X(t,n);return W[s]?.[r]||""}function V(e){return String(e?.assessmentId||"active")}function X(e,t){return String(e?.surveyTemplateQuestionId||e?.questionId||`question-${t}`)}function Nn(e){return e.internalValue||e.displayValue||"<no options>"}function y(e){return String(e??"").replace(/&/g,"&amp;").replace(/</g,"&lt;").replace(/>/g,"&gt;").replace(/"/g,"&quot;").replace(/'/g,"&#39;")}function nt(e){return window.CSS?.escape?CSS.escape(e):String(e).replace(/\\/g,"\\\\").replace(/"/g,'\\"')}async function xn(){if(!u)return;let t=`<!doctype html><html><head><meta charset="utf-8"></head><body>${u.reviewOutputCopyHtml||u.reviewOutputHtml||u.notesHtml||""}</body></html>`,n=u.reviewOutputText||u.notesText||a("reviewNotesContent")?.innerText||"",s=u.reviewOutputRtf||"";try{if(navigator.clipboard?.write&&window.ClipboardItem){let r={"text/html":new Blob([t],{type:"text/html"}),"text/plain":new Blob([n],{type:"text/plain"})};s&&(r["text/rtf"]=new Blob([s],{type:"text/rtf"}));try{await navigator.clipboard.write([new ClipboardItem(r)])}catch{await navigator.clipboard.write([new ClipboardItem({"text/html":new Blob([t],{type:"text/html"}),"text/plain":new Blob([n],{type:"text/plain"})})])}}else await navigator.clipboard.writeText(n);a("copyReviewNotesBtn").textContent="Copied",setTimeout(()=>{a("copyReviewNotesBtn").textContent="Copy Review Output"},1200)}catch{await navigator.clipboard.writeText(n)}}function Cn(){let e=new Map(Le.map(t=>[t.id,t.openUrl||t.url]));document.querySelectorAll(".prereq-open-link").forEach(t=>{let n=e.get(t.dataset.site);n&&(t.href=n,t.addEventListener("click",s=>{s.preventDefault(),s.stopPropagation(),chrome.tabs.create({url:n})}))})}async function Rn(){let e=await chrome.storage.local.get("prerequisiteStatus");e.prerequisiteStatus&&at(e.prerequisiteStatus)}async function st(){Ln();try{let e=await chrome.runtime.sendMessage({action:"CHECK_PREREQUISITES"});e?.success&&e.prerequisites&&at(e.prerequisites)}catch(e){a("prereqSummary").textContent=`Unable to check sessions: ${e.message}`,document.querySelectorAll(".prereq-item .signal").forEach(t=>{t.className="signal signal-fail"})}}function Ln(){a("prereqSummary").textContent="Checking Cairo, ESATS, and GTC sessions...",document.querySelectorAll(".prereq-item").forEach(e=>{let t=e.querySelector(".signal"),n=e.querySelector("small");t.className="signal signal-checking",n&&(n.textContent="Checking..."),e.title="Checking session..."})}function at(e){let t=e.checks||[];t.forEach(s=>{let r=document.querySelector(`.prereq-item[data-site="${s.id}"]`);if(!r)return;let o=r.querySelector(".signal"),i=r.querySelector("small");o.className=`signal ${s.passed?"signal-pass":"signal-fail"}`,i&&(i.textContent=s.passed?"Active":"Needs sign-in"),r.title=`${s.message}. Final URL: ${s.finalUrl}`});let n=t.filter(s=>!s.passed);if(n.length===0&&t.length>0){a("prereqSummary").textContent="All prerequisite sessions are active.";return}if(t.length===0){a("prereqSummary").textContent="Session checks have not run yet.";return}a("prereqSummary").textContent=`${n.length} session check${n.length===1?"":"s"} need attention. Open the help tooltip for sign-in steps.`}async function In(){b=await Oe(),R=await $e(),b&&b.length&&(xe(b),J=!0,a("exportBtn")?.classList.remove("hidden"),a("clearResultsBtn")?.classList.remove("hidden")),R&&R.length?(ue(R),ne=!0):ue([]);let e=await chrome.storage.local.get(E.STORAGE_KEYS.LAST_ACTION);U(e[E.STORAGE_KEYS.LAST_ACTION]==="review"?"review":"validation"),(await oe()).length&&a("retryFailedBtn")?.classList.remove("hidden")}async function On(){await chrome.runtime.sendMessage({action:"CLEAR_RESULTS"}),b=[],xe(b),J=!1,a("retryFailedBtn")?.classList.add("hidden"),a("cancelBtn")?.classList.add("hidden"),a("progressContainer")?.classList.add("hidden"),a("progressFill").style.width="0%",a("progressText").textContent="Starting...",q()}async function $n(){await chrome.runtime.sendMessage({action:"CLEAR_REVIEW_RESULTS"}),R=[],ue(R),ne=!1,a("reviewBtn").disabled=!1,a("cancelReviewBtn")?.classList.add("hidden"),Ee(),q()}async function kn(){let e=await oe();e.length!==0&&(J=!1,a("progressContainer")?.classList.remove("hidden"),Y({completed:0,total:e.length,current:"Starting validation",startedAt:Date.now()}),a("cancelBtn")?.classList.remove("hidden"),a("retryFailedBtn")?.classList.add("hidden"),await chrome.runtime.sendMessage({action:"START_VALIDATION",assessments:e}))}async function Dn(e){let n=(await ke())[e];if(!n)return;let s=new Blob([JSON.stringify(n,null,2)],{type:"application/json"}),r=URL.createObjectURL(s),o=document.createElement("a");o.href=r,o.download=`context_${e}.json`,o.click(),URL.revokeObjectURL(r)}async function Mn(){!b||b.length===0||await Be(b)}async function Fn(){let e=a("whatsNewIcon"),t=a("surveyDiffModal"),n=a("closeModalBtn"),s=a("refreshDiffBtn"),r=a("surveyFromSearch"),o=a("surveyToSearch"),i=a("runSurveyDiffBtn");!e||!t||!n||(e.addEventListener("click",async()=>{t.classList.remove("hidden");try{await _n()}catch(l){console.error("Survey diff modal restore error:",l),Re(),M(null,"Unable to load survey versions.")}}),n.addEventListener("click",()=>{t.classList.add("hidden")}),t.addEventListener("click",l=>{l.target===t&&t.classList.add("hidden")}),s&&s.addEventListener("click",Pn),r?.addEventListener("focus",()=>{D("from"),a("surveyFromOptions")?.classList.remove("hidden")}),r?.addEventListener("input",()=>{f=null,v=null,o&&(o.value="",o.disabled=!0,o.placeholder="Select From first"),ae(),se(),Q({selectedFromId:null,selectedToId:null,diff:null}),D("from"),a("surveyFromOptions")?.classList.remove("hidden")}),o?.addEventListener("focus",()=>{f&&(D("to"),a("surveyToOptions")?.classList.remove("hidden"))}),o?.addEventListener("input",()=>{v=null,ae(),se(),Q({selectedFromId:f?.surveyTemplateId||null,selectedToId:null,diff:null}),D("to"),a("surveyToOptions")?.classList.remove("hidden")}),i?.addEventListener("click",Qn),document.addEventListener("click",l=>{l.target.closest(".survey-combobox")||(a("surveyFromOptions")?.classList.add("hidden"),a("surveyToOptions")?.classList.add("hidden"))}))}async function me(){return(await chrome.storage.local.get(E.STORAGE_KEYS.WHATS_NEW_MODAL))[E.STORAGE_KEYS.WHATS_NEW_MODAL]||{}}async function Q(e){let t=await me();await chrome.storage.local.set({[E.STORAGE_KEYS.WHATS_NEW_MODAL]:{...t,...e,updatedAt:Date.now()}})}function Ye(e){return C.find(t=>Number(t.surveyTemplateId)===Number(e))||null}function Bn(){let e=a("surveyFromSearch"),t=a("surveyToSearch");e&&(e.value=f?z(f):""),t&&(t.value=v?z(v):"",t.disabled=!f,t.placeholder=f?"Search newer versions...":"Select From first"),ae()}async function _n(){let e=await me();Array.isArray(e.templates)&&e.templates.length>0&&(C=Ne(e.templates)),C.length===0&&(Re(),M(null,"Loading survey versions..."),await rt()),f=e.selectedFromId?Ye(e.selectedFromId):null,v=e.selectedToId?Ye(e.selectedToId):null,f&&v&&v.versionNumber<=f.versionNumber&&(v=null),Bn(),D("from"),e.diff&&f&&v?M(e.diff):M(null,"Select a From and To version, then click What's New.")}async function Pn(){let e=a("refreshDiffBtn");if(!(!e||e.disabled)){e.disabled=!0,e.setAttribute("aria-busy","true"),te+=1;try{Re(),se(),await Q({selectedFromId:null,selectedToId:null,diff:null,templates:[]}),await rt(!0)}catch(t){console.error("Survey template refresh error:",t),M(null,"Unable to load survey versions.")}finally{e.disabled=!1,e.removeAttribute("aria-busy")}}}function Ne(e){return(Array.isArray(e)?e:Object.values(e||{})).filter(n=>n&&n.surveyTemplateId&&n.versionNumber!==void 0&&n.versionNumber!==null).map(n=>({...n,surveyTemplateId:Number(n.surveyTemplateId),versionNumber:Number(n.versionNumber)})).filter(n=>!Number.isNaN(n.surveyTemplateId)&&!Number.isNaN(n.versionNumber)).sort((n,s)=>s.versionNumber-n.versionNumber)}async function rt(e=!1){if(C.length>0&&!e){D("from");return}if(!e){let n=await me();if(Array.isArray(n.templates)&&n.templates.length>0){C=Ne(n.templates),D("from");return}}e&&(C=[]);let t=a("surveyFromSearch");t&&(t.placeholder="Loading versions...",t.disabled=!0);try{C=Ne(await Ge()),await Q({templates:C}),t&&(t.disabled=!1,t.placeholder="Search versions..."),D("from")}catch(n){throw console.error("Survey template load error:",n),t&&(t.disabled=!1,t.placeholder="Unable to load versions"),n}}function Re(){f=null,v=null;let e=a("surveyFromSearch"),t=a("surveyToSearch");e&&(e.value="",e.disabled=!1,e.placeholder="Search versions..."),t&&(t.value="",t.disabled=!0,t.placeholder="Select From first"),a("surveyFromOptions")?.classList.add("hidden"),a("surveyToOptions")?.classList.add("hidden"),a("surveyFromOptions")&&(a("surveyFromOptions").innerHTML=""),a("surveyToOptions")&&(a("surveyToOptions").innerHTML=""),ae()}function se(){let e=a("diffDateRange"),t=a("diffContent");e&&(e.textContent="",e.classList.add("hidden")),t&&(t.innerHTML="")}function z(e){let t=e.releasedOn?_(e.releasedOn):"-",n=e.deactivatedOn?_(e.deactivatedOn):"-";return`Version-${e.versionNumber} (Released on: ${t}, Deactivated on: ${n})`}function Un(e){return e==="to"?f?C.filter(t=>t.versionNumber>f.versionNumber):[]:C}function D(e){let t=a(e==="from"?"surveyFromSearch":"surveyToSearch"),n=a(e==="from"?"surveyFromOptions":"surveyToOptions");if(!t||!n)return;let s=t.value.trim().toLowerCase(),r=Un(e).filter(o=>z(o).toLowerCase().includes(s));if(n.innerHTML="",r.length===0){let o=document.createElement("div");o.className="survey-option-empty",o.textContent=C.length===0?"No survey versions found.":"No matching versions.",n.appendChild(o);return}r.forEach(o=>{let i=document.createElement("button");i.type="button",i.className="survey-option",i.value=String(o.surveyTemplateId),i.textContent=z(o),i.addEventListener("click",()=>{qn(e,o)}),n.appendChild(i)})}function qn(e,t){if(e==="from"){f=t,v=null;let n=a("surveyFromSearch"),s=a("surveyToSearch");n&&(n.value=z(t)),s&&(s.value="",s.disabled=!1,s.placeholder="Search newer versions..."),a("surveyFromOptions")?.classList.add("hidden"),D("to"),se(),Q({selectedFromId:t.surveyTemplateId,selectedToId:null,diff:null})}else{v=t;let n=a("surveyToSearch");n&&(n.value=z(t)),a("surveyToOptions")?.classList.add("hidden"),se(),Q({selectedFromId:f?.surveyTemplateId||null,selectedToId:t.surveyTemplateId,diff:null})}ae()}function ae(){let e=a("runSurveyDiffBtn");e&&e.classList.toggle("hidden",!f||!v)}async function Qn(){if(!f||!v)return;let e=a("runSurveyDiffBtn"),t=te+1;te=t,e&&(e.disabled=!0,e.textContent="Loading...");try{let n=await me();if(n.diff&&Number(n.selectedFromId)===Number(f.surveyTemplateId)&&Number(n.selectedToId)===Number(v.surveyTemplateId)){M(n.diff);return}M(null,"Loading changes...");let s=await Ke(f.surveyTemplateId,v.surveyTemplateId);t===te&&(M(s),await Q({selectedFromId:f.surveyTemplateId,selectedToId:v.surveyTemplateId,diff:s}))}catch(n){console.error("Survey diff error:",n),t===te&&M(null,"Unable to load survey differences.")}finally{e&&(e.disabled=!1,e.textContent="What's New")}}function M(e,t="No changes detected between the selected survey templates."){let n=a("diffDateRange"),s=a("diffContent");if(!n||!s)return;if(s.innerHTML="",!e||e.newQuestions.length===0&&e.removedQuestions.length===0&&e.modifiedQuestions.length===0){n.classList.add("hidden");let i=document.createElement("div");i.className="diff-empty",i.textContent=t,s.appendChild(i);return}let r=e.metadata.fromReleasedOn||e.metadata.fromUpdatedOn?_(e.metadata.fromReleasedOn||e.metadata.fromUpdatedOn):"Unknown",o=e.metadata.toReleasedOn||e.metadata.toUpdatedOn?_(e.metadata.toReleasedOn||e.metadata.toUpdatedOn):"Unknown";n.textContent=`From V-${e.metadata.fromVersionNumber||e.metadata.fromId} (${r}) to V-${e.metadata.toVersionNumber||e.metadata.toId} (${o})`,n.classList.remove("hidden"),e.newQuestions.forEach(i=>{let l=document.createElement("div");l.className="diff-item",l.innerHTML=`
            <h4><span class="diff-tag new">New Question</span> <span class="diff-id">[${i.alternateQuestionId}]</span></h4>
            <div class="diff-detail"><strong>Context:</strong> ${i.questionText||"\u2014"}</div>
        `,s.appendChild(l)}),e.removedQuestions.forEach(i=>{let l=document.createElement("div");l.className="diff-item",l.innerHTML=`
            <h4><span class="diff-tag removed">Removed Question</span> <span class="diff-id">[${i.alternateQuestionId}]</span></h4>
            <div class="diff-detail"><strong>Context:</strong> ${i.questionText||"\u2014"}</div>
        `,s.appendChild(l)}),e.modifiedQuestions.forEach(i=>{let l=document.createElement("div");l.className="diff-item";let d="",c="";i.textChanged&&(d+='<span class="diff-tag changed">Question Changed</span>',c+=`
                <div class="diff-detail"><strong>Old:</strong> ${i.textChanged.old}</div>
                <div class="diff-detail"><strong>New:</strong> ${i.textChanged.new}</div>
            `),i.optionsChanged&&(d+='<span class="diff-tag changed">Options Changed</span>',i.optionsChanged.added?.length>0&&(c+=`<div class="diff-detail"><strong>Added Options:</strong> ${i.optionsChanged.added.join(", ")}</div>`),i.optionsChanged.removed?.length>0&&(c+=`<div class="diff-detail"><strong>Removed Options:</strong> ${i.optionsChanged.removed.join(", ")}</div>`)),l.innerHTML=`
            <h4>${d} <span class="diff-id">[${i.alternateQuestionId}]</span></h4>
            ${c}
        `,s.appendChild(l)})}
