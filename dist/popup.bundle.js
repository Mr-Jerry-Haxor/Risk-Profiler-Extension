var S={VERSION:"1.0.0",MAX_CONCURRENT_VALIDATIONS:5,STORAGE_KEYS:{SETTINGS:"settings",ASSESSMENTS:"assessments",SELECTED_ASSESSMENTS:"selectedAssessments",CONTEXTS:"contexts",VALIDATIONS:"validations",REVIEWS:"reviews",LAST_RUN:"lastRun",LAST_ACTION:"lastAction",DEBUG:"debug",WHATS_NEW_MODAL:"whatsNewModalState",REVIEW_MODE:"reviewMode"}},Y={INITIAL:"initial",SELECTED_ANSWERS:"selectedAnswers"};var te={PRIMARY_ASSESSMENTS:"https://cairois.web.boeing.com/api/asset/4/82/assessment/type/35",ASSESSMENT_DETAIL:"https://cairois.web.boeing.com/api/assessment/{id}/detail",ASSESSMENT_ANSWERS:"https://cairois.web.boeing.com/api/assessment/survey/{id}/answers",ASSESSMENT_CONTACTS:"https://cairois.web.boeing.com/api/assessment/{id}/contacts",SURVEY_TEMPLATE_QUESTIONS:"https://cairois.web.boeing.com/api/survey/template/{id}/questions",SURVEY_TEMPLATE_DETAIL:"https://cairois.web.boeing.com/api/surveyTemplate/{id}",SURVEY_TEMPLATES_RP_APP:"https://cairois.web.boeing.com/api/surveyTemplate?where=alternateSurveyTemplateId:=:rp-app",REVIEW_SUMMARY:"https://cairois.web.boeing.com/api/asset/4/{assetId}/assessment/review/summaries?assessmentTypeId=35&reviewTypeId=6",ESATS_VERSIONS:"https://service-gateway.tas-phx.apps.boeing.com/gateway/asset/BusinessApplicationVersion/GetBusinessApplicationVersions?esatsId={assetId}",ESATS_ARTIFACTS:"https://service-gateway.tas-phx.apps.boeing.com/gateway/asset/BusinessApplicationVersionDocument/GetBusinessApplicationVersionPolicyAndArtifacts?esatsId={versionEsatsId}",ESATS_CONTACT_DETAILS_SUMMARY:"https://service-gateway.tas-phx.apps.boeing.com/gateway/asset/BusinessApplicationSummary/GetContactDetailsSummary?esatsId={assetId}",GTC_LOOKUP:"https://termbank.web.boeing.com/ses/v1.2/GlobalTradeControlVocabularies/name/{name}.json"},Pe=[{id:"cairo",name:"Cairo",url:te.PRIMARY_ASSESSMENTS,openUrl:"https://cairois.web.boeing.com/",expectedHosts:["cairois.web.boeing.com"]},{id:"esats",name:"ESATS",url:"https://service-gateway.tas-phx.apps.boeing.com/",openUrl:"https://esats.web.boeing.com/",expectedHosts:["service-gateway.tas-phx.apps.boeing.com","esats.web.boeing.com"]},{id:"gtc",name:"GTC",url:"https://termbank.web.boeing.com/",openUrl:"https://gtc-ecm.web.boeing.com/",expectedHosts:["termbank.web.boeing.com","gtc-ecm.web.boeing.com"]}];async function ge(e){return(await chrome.storage.local.get(e))[e]}async function Ue(){return await ge(S.STORAGE_KEYS.ASSESSMENTS)||[]}async function qe(){return await ge(S.STORAGE_KEYS.VALIDATIONS)||[]}async function Qe(){return await ge(S.STORAGE_KEYS.REVIEWS)||[]}async function ce(){return(await chrome.storage.local.get("failedAssessments")).failedAssessments||[]}async function Ve(){return(await chrome.storage.local.get("assessmentContexts")).assessmentContexts||{}}function Ge(e,t){let n=[...e];if(t.search&&t.search.trim())if(t.regexMode)try{let s=new RegExp(t.search,"i");n=n.filter(a=>s.test(a.assetName||""))}catch{return[]}else{let s=t.search.toLowerCase();n=n.filter(a=>(a.assetName||"").toLowerCase().includes(s))}return t.fromDate&&(n=n.filter(s=>{let a=He(s,t.dateFilterField);return!!a&&a>=t.fromDate})),t.toDate&&(n=n.filter(s=>{let a=He(s,t.dateFilterField);return!!a&&a<=t.toDate})),t.assessmentStatus&&(n=n.filter(s=>{let a=de(s);return!(t.assessmentStatus==="incomplete"&&!a||t.assessmentStatus==="completed"&&a)})),n}function de(e){return!!(e.incompleteAssessmentId||e.hasIncomplete)}function wt(e,t){return t==="dueOn"?e.dueOn||e.raw?.dueOn:e.surveyCompletedOn||e.raw?.surveyCompletedOn}function He(e,t){let n=wt(e,t);if(!n)return"";let a=String(n).match(/^\d{4}-\d{2}-\d{2}/);if(a)return a[0];let l=new Date(n);return Number.isNaN(l.getTime())?"":[l.getFullYear(),String(l.getMonth()+1).padStart(2,"0"),String(l.getDate()).padStart(2,"0")].join("-")}function We(e){return e.map(t=>t.assessmentId)}var vt=chrome.runtime.getURL("assets/encoded_data.txt");async function je(e){let t=Array.isArray(e)?e:[],n=await ht(),s=n.worksheets[0],a=n.addWorksheet("All Assessments"),l=new Map;for(let i=0;i<t.length;i++){let d=t[i],c=Ye(d),N=At(c,i);l.set(c.assessmentId,N);let v=Et(n,s,N);yt(v,d,c)}gt(a,t,l),n.removeWorksheet(s.id),n.calcProperties.fullCalcOnLoad=!0,n.calcProperties.calcMode="auto";let r=await n.xlsx.writeBuffer();Nt(r,`Risk_Profiler_Quality_List_${Tt()}.xlsx`)}async function ht(){let t=(await(await fetch(vt)).text()).trim(),n=Uint8Array.from(atob(t),a=>a.charCodeAt(0)),s=new ExcelJS.Workbook;return await s.xlsx.load(n.buffer),s}function gt(e,t,n){e.columns=[{header:"Open",key:"open",width:15},{header:"Assessment ID",key:"assessmentId",width:18},{header:"Application",key:"application",width:40},{header:"Asset ID",key:"assetId",width:15},{header:"Lifecycle",key:"lifecycle",width:20},{header:"Application Manager",key:"manager",width:30},{header:"Business System Owner",key:"owner",width:30},{header:"Survey Completed Date",key:"surveyCompletedDate",width:22},{header:"Attested Date",key:"attestedDate",width:22},{header:"Status",key:"status",width:15},{header:"Attested By",key:"attestedBy",width:30},{header:"Passed",key:"passed",width:12},{header:"Failed",key:"failed",width:12},{header:"N/A",key:"na",width:12},{header:"Score",key:"score",width:12},{header:"Error",key:"error",width:60}],t.forEach(s=>{let a=Ye(s),l=s.summary||{},r=(s.results||[]).filter(g=>g.status==="FAIL").map(g=>`${g.id}: ${g.reason}`),i=(s.results||[]).filter(g=>g.reason==="Question identifier was not found in the survey questions.").map(g=>g.id),d=[s.error,i.length?`Missing Questions: ${i.join(", ")}`:"",r.length?r.join(" | "):""].filter(Boolean).join(" | "),c=e.addRow({open:"Open",assessmentId:a.assessmentId,application:a.assetName,assetId:a.assetId,lifecycle:a.lifeCycle,manager:a.appMgrName,owner:a.sysOwnerName,surveyCompletedDate:ye(a.surveyCompletedOn),attestedDate:ye(a.attestOn),status:a.hasIncomplete?"Incomplete":"Completed",attestedBy:a.attestName||"",passed:l.passed||0,failed:l.failed||0,na:l.na||0,score:l.score?`${l.score}%`:"",error:d}),N=n.get(a.assessmentId),v=c.getCell(1);v.value={text:"Open",hyperlink:`#'${N}'!A1`},v.font={color:{argb:"FF0563C1"},underline:!0}}),e.getRow(1).font={bold:!0}}function yt(e,t,n){e.getCell("C2").value=n.assetName||"",e.getCell("C3").value=n.assetId||"",e.getCell("C4").value=n.appMgrName||"",e.getCell("C5").value=ye(new Date);let s=St(e);(t.results||[]).forEach(a=>{let l=s[String(a.id).toUpperCase()];if(!l)return;let r=e.getCell(`A${l}`);r.value=bt(a.status);let i=String(a.status||"").toUpperCase();i==="PASS"?(r.fill={type:"pattern",pattern:"solid",fgColor:{argb:"FF00A300"}},r.font={color:{argb:"ff000000"},bold:!0}):i==="FAIL"?(r.fill={type:"pattern",pattern:"solid",fgColor:{argb:"FFFF0000"}},r.font={color:{argb:"ff000000"},bold:!0}):i==="NA"&&(r.fill={type:"pattern",pattern:"solid",fgColor:{argb:"FFD9D9D9"}},r.font={color:{argb:"ff000000"},italic:!0}),e.getCell(`D${l}`).value=a.reason||""})}function St(e){let t={};return e.eachRow((n,s)=>{let a=String(n.getCell(2).value||"").trim().toUpperCase();/^RP\d+$/.test(a)&&(t[a]=s)}),t}function Et(e,t,n){let s=e.addWorksheet(n);return t.properties&&(s.properties=JSON.parse(JSON.stringify(t.properties))),t.pageSetup&&(s.pageSetup=JSON.parse(JSON.stringify(t.pageSetup))),t.views&&(s.views=JSON.parse(JSON.stringify(t.views))),t.columns.forEach((a,l)=>{let r=s.getColumn(l+1);r.width=a.width,r.hidden=a.hidden,r.outlineLevel=a.outlineLevel}),t.eachRow({includeEmpty:!0},(a,l)=>{let r=s.getRow(l);r.height=a.height,r.hidden=a.hidden,r.outlineLevel=a.outlineLevel,a.eachCell({includeEmpty:!0},(i,d)=>{let c=r.getCell(d);if(typeof i.value=="object"&&i.value!==null)try{c.value=JSON.parse(JSON.stringify(i.value))}catch{c.value=i.text||""}else c.value=i.value;try{c.style=JSON.parse(JSON.stringify(i.style||{}))}catch{c.style={}}if(i.alignment)try{c.alignment=JSON.parse(JSON.stringify(i.alignment))}catch{}if(i.font)try{c.font=JSON.parse(JSON.stringify(i.font))}catch{}if(i.border)try{c.border=JSON.parse(JSON.stringify(i.border))}catch{}if(i.fill)try{c.fill=JSON.parse(JSON.stringify(i.fill))}catch{}if(i.numFmt&&(c.numFmt=i.numFmt),i.protection)try{c.protection=JSON.parse(JSON.stringify(i.protection))}catch{}})}),t.model?.merges&&t.model.merges.forEach(a=>{try{s.mergeCells(a)}catch{}}),s}function bt(e){switch(String(e||"").toUpperCase()){case"PASS":return"Yes";case"FAIL":return"No";case"NA":return"N/A";default:return""}}function Ye(e){return{...e.assessment||{},assessmentId:e.assessmentId,assetName:e.assetName,...e.assessment||{}}}function At(e,t){return(e.assetName||`Assessment ${t+1}`).replace(/[\\/?*[\]:]/g," ").trim().slice(0,31)}function ye(e){if(!e)return"";try{return new Date(e).toLocaleDateString()}catch{return e}}function Tt(){let e=new Date,t=n=>String(n).padStart(2,"0");return`${e.getFullYear()}${t(e.getMonth()+1)}${t(e.getDate())}_${t(e.getHours())}${t(e.getMinutes())}${t(e.getSeconds())}`}function Nt(e,t){let n=new Blob([e],{type:"application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"}),s=URL.createObjectURL(n),a=document.createElement("a");a.href=s,a.download=t,a.click(),setTimeout(()=>URL.revokeObjectURL(s),1e3)}var Te="http://schemas.openxmlformats.org/wordprocessingml/2006/main",xt="http://schemas.microsoft.com/office/word/2010/wordml",It="http://schemas.openxmlformats.org/markup-compatibility/2006",Ct=`<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types">
    <Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/>
    <Default Extension="xml" ContentType="application/xml"/>
    <Override PartName="/word/document.xml" ContentType="application/vnd.openxmlformats-officedocument.wordprocessingml.document.main+xml"/>
    <Override PartName="/word/styles.xml" ContentType="application/vnd.openxmlformats-officedocument.wordprocessingml.styles+xml"/>
    <Override PartName="/word/settings.xml" ContentType="application/vnd.openxmlformats-officedocument.wordprocessingml.settings+xml"/>
</Types>`,Rt=`<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">
    <Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/officeDocument" Target="word/document.xml"/>
</Relationships>`,Lt=`<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships"/>`,Ot=`<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<w:styles xmlns:w="${Te}">
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
</w:styles>`,$t=`<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<w:settings xmlns:w="${Te}">
    <w:updateFields w:val="true"/>
</w:settings>`,Ke=new TextEncoder,kt=Ht();async function ze(e){let t=new Blob([Mt(e)],{type:"application/vnd.openxmlformats-officedocument.wordprocessingml.document"}),n=URL.createObjectURL(t),s=document.createElement("a");s.href=n,s.download=`${jt(e?.assetName||"application")}_RISK-PRofiler_review_notes.docx`,s.click(),URL.revokeObjectURL(n)}function Mt(e){return Vt([{name:"[Content_Types].xml",content:Ct},{name:"_rels/.rels",content:Rt},{name:"word/document.xml",content:Dt(e)},{name:"word/_rels/document.xml.rels",content:Lt},{name:"word/styles.xml",content:Ot},{name:"word/settings.xml",content:$t}])}function Dt(e){let t=e?.contacts||[],n=[T([y(`${e?.assetName||"Application"} Risk Profiler Review Notes`,{bold:!0})],{style:"Title",spacingAfter:260}),T([y("Application Details",{bold:!0})],{style:"Heading1"}),_t([["Application Name",e?.assetName||"N/A"],["Due Date",Ee(e?.dueOn)||"N/A"],["Survey Completed On (Last)",Ee(e?.surveyCompletedOn)||"N/A"],["Review Assessment Date",Ee(e?.reviewedAt)||"N/A"]]),T([y("Contacts",{bold:!0})],{style:"Heading1",spacingBefore:180}),Bt(t),T([y("Review Output",{bold:!0})],{style:"Heading1",spacingBefore:220}),Ft(e?.workQueue||[])].join("");return`<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<w:document
    xmlns:w="${Te}"
    xmlns:w14="${xt}"
    xmlns:mc="${It}"
    mc:Ignorable="w14">
    <w:body>
        ${n}
        <w:sectPr>
            <w:pgSz w:w="12240" w:h="15840"/>
            <w:pgMar w:top="720" w:right="720" w:bottom="720" w:left="720" w:header="360" w:footer="360" w:gutter="0"/>
        </w:sectPr>
    </w:body>
</w:document>`}function Bt(e){if(e.length===0)return T([y("No Application Manager or Business System Manager details were found.")]);let t=[ue([L("Contact Type",{bold:!0,fill:"E8EEFC"}),L("Name",{bold:!0,fill:"E8EEFC"}),L("BEMS ID",{bold:!0,fill:"E8EEFC"}),L("Email",{bold:!0,fill:"E8EEFC"})]),...e.map(n=>ue([L(n.contactType||"N/A"),L(n.associatedTo||"N/A"),L(n.bemsId||"N/A"),L(n.email||"N/A")]))];return Ne(t)}function _t(e){return Ne(e.map(([t,n])=>ue([L(t,{bold:!0,fill:"F3F4F6"}),L(n)])))}function Ft(e){return e.length===0?T([y("No reachable unanswered work queue items were found.")]):e.map((t,n)=>[t.status?T([y(t.status,{bold:!0,color:"315FD6"})],{spacingBefore:n===0?80:180,spacingAfter:80}):"",Ut(t.questionGroup||"N/A",t.questionId||"N/A"),Se("Question",t.question||"N/A"),Se("Answer Type",t.answerType||"N/A"),t.asaNotes?Se("ASA Notes",t.asaNotes,{fill:"FFF7CC"}):"",T([y("Options",{bold:!0})]),...Pt(t.options||[]),Qt()].join("")).join("")}function Pt(e){return(e.length?e:[{index:1,internalValue:"<no options>"}]).map(n=>T([qt(),y(` ${n.internalValue||n.displayValue||"<no options>"}`)],{indentLeft:360,spacingAfter:70}))}function Ut(e,t){return Ne([ue([be([y("Category: ",{bold:!0}),y(e)]),be([y("Question ID: ",{bold:!0}),y(t)],{align:"right"})])],{noBorders:!0})}function Se(e,t,n={}){return T([y(`${e}: `,{bold:!0}),y(t)],n)}function qt(){return`
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
        </w:sdt>`}function Qt(){return T([],{borderBottom:!0,spacingBefore:80,spacingAfter:140})}function T(e,t={}){let n=[];return t.style&&n.push(`<w:pStyle w:val="${Ae(t.style)}"/>`),t.align&&n.push(`<w:jc w:val="${t.align}"/>`),(t.spacingBefore||t.spacingAfter)&&n.push(`<w:spacing w:before="${t.spacingBefore||0}" w:after="${t.spacingAfter||0}"/>`),t.indentLeft&&n.push(`<w:ind w:left="${t.indentLeft}"/>`),t.borderBottom&&n.push('<w:pBdr><w:bottom w:val="single" w:sz="6" w:space="1" w:color="CBD5E1"/></w:pBdr>'),t.fill&&n.push(`<w:shd w:fill="${Ae(t.fill)}"/>`),`<w:p>${n.length?`<w:pPr>${n.join("")}</w:pPr>`:""}${e.join("")}</w:p>`}function y(e,t={}){let n=[];return t.bold&&n.push("<w:b/>"),t.color&&n.push(`<w:color w:val="${t.color}"/>`),`<w:r>${n.length?`<w:rPr>${n.join("")}</w:rPr>`:""}<w:t xml:space="preserve">${Ae(e)}</w:t></w:r>`}function Ne(e,t={}){return`<w:tbl>
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
    </w:tbl>`}function ue(e){return`<w:tr>${e.join("")}</w:tr>`}function L(e,t={}){return be([y(e||"",{bold:t.bold})],t)}function be(e,t={}){let n=['<w:tcW w:w="2500" w:type="pct"/>','<w:tcMar><w:top w:w="80" w:type="dxa"/><w:left w:w="80" w:type="dxa"/><w:bottom w:w="80" w:type="dxa"/><w:right w:w="80" w:type="dxa"/></w:tcMar>'];return t.fill&&n.push(`<w:shd w:fill="${t.fill}"/>`),`<w:tc><w:tcPr>${n.join("")}</w:tcPr>${T(e,{align:t.align})}</w:tc>`}function Vt(e){let t=0,n=[],s=[];e.forEach(r=>{let i=Ke.encode(r.name),d=Ke.encode(r.content),c=Gt(d);n.push(b(67324752),m(20),m(0),m(0),m(0),m(0),b(c),b(d.length),b(d.length),m(i.length),m(0),i,d),s.push(b(33639248),m(20),m(20),m(0),m(0),m(0),m(0),b(c),b(d.length),b(d.length),m(i.length),m(0),m(0),m(0),m(0),b(0),b(t),i),t+=30+i.length+d.length});let a=Je(s),l=[b(101010256),m(0),m(0),m(e.length),m(e.length),b(a),b(t),m(0)];return Wt([...n,...s,...l])}function Ht(){let e=[];for(let t=0;t<256;t+=1){let n=t;for(let s=0;s<8;s+=1)n=n&1?3988292384^n>>>1:n>>>1;e[t]=n>>>0}return e}function Gt(e){let t=4294967295;for(let n of e)t=kt[(t^n)&255]^t>>>8;return(t^4294967295)>>>0}function m(e){let t=new Uint8Array(2);return new DataView(t.buffer).setUint16(0,e,!0),t}function b(e){let t=new Uint8Array(4);return new DataView(t.buffer).setUint32(0,e>>>0,!0),t}function Wt(e){let t=Je(e),n=new Uint8Array(t),s=0;return e.forEach(a=>{n.set(a,s),s+=a.length}),n}function Je(e){return e.reduce((t,n)=>t+n.length,0)}function Ae(e){return String(e??"").replace(/&/g,"&amp;").replace(/</g,"&lt;").replace(/>/g,"&gt;").replace(/"/g,"&quot;").replace(/'/g,"&apos;")}function Ee(e){if(!e)return"";let t=new Date(e);return Number.isNaN(t.getTime())?String(e):t.toLocaleDateString(void 0,{year:"numeric",month:"short",day:"2-digit"})}function jt(e){return String(e).trim().replace(/[\\/:*?"<>|]+/g,"_").replace(/\s+/g,"_").replace(/^_+|_+$/g,"")||"application"}function xe(e,t){let n=e;return Object.entries(t).forEach(([s,a])=>{n=n.replace(`{${s}}`,a)}),n}var ne=new Map,Yt="https://esats.web.boeing.com",Kt="service-gateway.tas-phx.apps.boeing.com",zt="https://gtc-ecm.web.boeing.com",Jt="termbank.web.boeing.com",Xt={retries:3,retryDelay:1e3,useCache:!0};function Zt(e){return new Promise(t=>setTimeout(t,e))}function en(e){try{return new URL(e).hostname===Kt}catch{return!1}}function tn(e){try{return new URL(e).hostname===Jt}catch{return!1}}function nn(){return typeof chrome<"u"&&chrome.tabs&&chrome.scripting}function sn(e){return new Promise(t=>{chrome.tabs.query(e,t)})}async function on(e){let t=await sn({url:`${e}/*`});return t.find(n=>n.id&&n.status==="complete")||t.find(n=>n.id)}function an(e){return new Promise((t,n)=>{chrome.scripting.executeScript(e,s=>{let a=chrome.runtime.lastError;if(a){n(new Error(a.message));return}t(s)})})}async function Xe(e,{pageOrigin:t,label:n,useBearerToken:s}){if(!nn())throw new Error(`${n} requests require the Chrome scripting permission.`);let a=await on(t);if(!a)throw new Error(`Open ${n} in this browser and sign in before running ${n} validation requests.`);let r=(await an({target:{tabId:a.id},world:"MAIN",args:[e,s,t],func:async(i,d,c)=>{function N(R){if(!R)return null;let E=String(R).trim();E.startsWith("Bearer ")&&(E=E.slice(7).trim());try{let p=JSON.parse(E);typeof p=="string"?E=p.trim():p&&typeof p=="object"&&(E=p.esatsToken||p.access_token||p.token||p.value||E)}catch{}return E||null}let v=d?N(localStorage.getItem("esatsToken")):null,g={Accept:"application/json, text/plain, */*"};d&&v&&(g.Authorization=`Bearer ${v}`);try{let p=null,H=null;for(let j=1;j<=3;j++){try{if(p=await fetch(i,{method:"GET",headers:g,credentials:"omit",cache:"no-store",referrer:`${c}/`,referrerPolicy:"strict-origin-when-cross-origin"}),p.ok)break;H=new Error(`${p.status} ${p.statusText}`)}catch(x){H=x}j<3&&await new Promise(x=>setTimeout(x,1e3))}if(!p||!p.ok)throw H||new Error("Request failed");let G=await p.text(),W=null;if(G)try{W=JSON.parse(G)}catch{W=G}return{ok:p.ok,status:p.status,statusText:p.statusText,url:p.url,hasAuthorization:d?!!v:!0,data:W}}catch(R){return console.log("ESATS token:",v),console.log("Request URL:",i),console.log("Headers:",g),{ok:!1,status:0,statusText:R.message||"Request failed",hasAuthorization:d?!!v:!0,error:R.message}}}}))?.[0]?.result;if(!r)throw new Error(`${n} request did not return a response.`);if(!r.ok){let i=r.hasAuthorization?"":" No ESATS bearer token was found in the ESATS tab.";throw new Error(`${n} request failed: ${r.status} ${r.statusText}.${i}`)}return r.data}async function rn(e){return Xe(e,{pageOrigin:Yt,label:"ESATS",useBearerToken:!0})}async function ln(e){return Xe(e,{pageOrigin:zt,label:"GTC",useBearerToken:!1})}async function pe(e,t={}){let n={...Xt,...t};if(n.useCache&&ne.has(e))return ne.get(e);let s;for(let a=1;a<=n.retries;a++)try{if(en(e)){let i=await rn(e);return n.useCache&&ne.set(e,i),i}if(tn(e)){let i=await ln(e);return n.useCache&&ne.set(e,i),i}let l=await fetch(e,{credentials:"include",headers:{Accept:"application/json, text/plain, */*"},cache:"no-store"});if(!l.ok)throw new Error(`${l.status} ${l.statusText}`);let r=await l.json();return n.useCache&&ne.set(e,r),r}catch(l){s=l,a<n.retries&&await Zt(n.retryDelay)}throw s}async function Ie(e){if(!e)return[];let t=xe(te.SURVEY_TEMPLATE_QUESTIONS,{id:e});return pe(t)}async function Ce(e){if(!e)return null;let t=xe(te.SURVEY_TEMPLATE_DETAIL,{id:e});return pe(t)}async function Ze(){return pe(te.SURVEY_TEMPLATES_RP_APP,{useCache:!1})}function et(e){let t=new Map;for(let n of e)n.alternateQuestionId&&t.set(n.alternateQuestionId,n);return t}async function tt(e,t){if(!e||!t)throw new Error("Both survey template IDs are required.");if(Number(e)===Number(t))return{metadata:{fromId:Number(e),toId:Number(t)},newQuestions:[],removedQuestions:[],modifiedQuestions:[]};let[n,s,a,l]=await Promise.all([Ce(e),Ie(e),Ce(t),Ie(t)]);if(!n||!a)throw new Error("Unable to load one or both survey template details.");let r=et(s||[]),i=et(l||[]),d=new Set([...r.keys(),...i.keys()]),c=Array.from(d).sort(),N={metadata:{fromId:Number(e),fromVersionNumber:n.versionNumber,fromUpdatedOn:n.updatedOn,fromReleasedOn:n.releasedOn,toId:Number(t),toVersionNumber:a.versionNumber,toUpdatedOn:a.updatedOn,toReleasedOn:a.releasedOn},newQuestions:[],removedQuestions:[],modifiedQuestions:[]};for(let v of c)if(!r.has(v))N.newQuestions.push({alternateQuestionId:v,questionText:i.get(v).questionText});else if(!i.has(v))N.removedQuestions.push({alternateQuestionId:v,questionText:r.get(v).questionText});else{let g=r.get(v),R=i.get(v),E=!1,p={alternateQuestionId:v};g.questionText!==R.questionText&&(p.textChanged={old:g.questionText,new:R.questionText},E=!0);let H=new Set((g.options||[]).map(x=>x.displayValue)),G=new Set((R.options||[]).map(x=>x.displayValue)),W=[...G].filter(x=>!H.has(x)),j=[...H].filter(x=>!G.has(x));(W.length>0||j.length>0)&&(p.optionsChanged={added:W,removed:j},E=!0),E&&N.modifiedQuestions.push(p)}return N}var P=[],M=[],Le=[],J="",$=[],A=[],C=[],X=!1,oe=!1,O="validation",u=null,F={},z={},I=[],w=null,h=null,se=0,ae=Y.INITIAL,o=e=>document.getElementById(e);document.addEventListener("DOMContentLoaded",cn);async function cn(){await ot(),await $n(),await An(),pn(),await Gn(),pt(),xn(),jn(),Zn()}async function ot(){P=await Ue(),M=[...P],dn(),le()}function dn(){Le=[...new Set(P.map(e=>e.appMgrName))].filter(Boolean).sort(),ve()}function un(e){let t=o("ownerOptions");if(!t)return;t.innerHTML="";let n=document.createElement("button");n.type="button",n.className="manager-option",n.textContent="All Application Managers",n.addEventListener("click",()=>{J="",o("ownerSearchInput").value="",fe(),k()}),t.appendChild(n),e.forEach(s=>{let a=document.createElement("button");a.type="button",a.className="manager-option",a.textContent=s,a.addEventListener("click",()=>{J=s,o("ownerSearchInput").value=s,fe(),k()}),t.appendChild(a)})}function at(){let e=o("ownerSearchInput")?.value?.trim()||"";if(!e)return null;try{return new RegExp(e,"i")}catch{return null}}function ve(){let e=at(),t=e?Le.filter(n=>e.test(n)):Le;un(t)}function nt(){ve(),o("ownerOptions")?.classList.remove("hidden")}function fe(){o("ownerOptions")?.classList.add("hidden")}function pn(){o("searchInput")?.addEventListener("input",k),o("regexMode")?.addEventListener("change",k),o("fromDate")?.addEventListener("change",k),o("toDate")?.addEventListener("change",k),o("dateFilterField")?.addEventListener("change",k),o("assessmentStatusFilter")?.addEventListener("change",k),o("ownerSearchInput")?.addEventListener("focus",nt),o("ownerSearchInput")?.addEventListener("input",()=>{J="",ve(),nt(),k()}),o("ownerSearchInput")?.addEventListener("keydown",e=>{e.key==="Escape"&&fe()}),document.addEventListener("click",e=>{e.target.closest(".manager-search-select")||fe()}),o("clearFiltersBtn")?.addEventListener("click",fn),o("refreshBtn")?.addEventListener("click",Sn),o("checkPrereqBtn")?.addEventListener("click",pt),o("selectAllBtn")?.addEventListener("click",gn),o("clearSelectionBtn")?.addEventListener("click",yn),o("validateBtn")?.addEventListener("click",En),o("reviewBtn")?.addEventListener("click",bn),o("reviewSettingsBtn")?.addEventListener("click",Tn),o("scrollToggleBtn")?.addEventListener("click",mn),window.addEventListener("scroll",me,{passive:!0}),window.addEventListener("resize",me),typeof ResizeObserver<"u"&&new ResizeObserver(me).observe(document.body),o("closeReviewSettingsModalBtn")?.addEventListener("click",Oe),o("reviewSettingsModal")?.addEventListener("click",e=>{e.target===o("reviewSettingsModal")&&Oe()}),o("saveReviewSettingsBtn")?.addEventListener("click",Nn),o("cancelBtn")?.addEventListener("click",async()=>{await chrome.runtime.sendMessage({action:"STOP_VALIDATION"})}),o("cancelReviewBtn")?.addEventListener("click",async()=>{await chrome.runtime.sendMessage({action:"STOP_REVIEW"})}),o("retryFailedBtn")?.addEventListener("click",zn),o("clearResultsBtn")?.addEventListener("click",Yn),o("clearReviewResultsBtn")?.addEventListener("click",Kn),o("exportBtn")?.addEventListener("click",Xn),o("validationTabBtn")?.addEventListener("click",()=>U("validation")),o("reviewTabBtn")?.addEventListener("click",()=>U("review")),o("closeReviewNotesModalBtn")?.addEventListener("click",$e),o("reviewNotesModal")?.addEventListener("click",e=>{e.target===o("reviewNotesModal")&&$e()}),o("copyReviewNotesBtn")?.addEventListener("click",Vn),o("selectAllReviewNotesBtn")?.addEventListener("click",Fn),o("downloadReviewNotesBtn")?.addEventListener("click",In),Hn(),me()}function De(){let e=window.scrollY||document.documentElement.scrollTop||document.body.scrollTop||0,t=Math.max(document.documentElement.scrollHeight,document.body.scrollHeight),n=window.innerHeight||document.documentElement.clientHeight,s=Math.max(0,t-n);return{scrollTop:e,maxScroll:s}}function rt(){let{scrollTop:e,maxScroll:t}=De();return t<=0?!1:e>=t/2}function me(){let e=o("scrollToggleBtn");if(!e)return;let{maxScroll:t}=De(),n=rt();e.classList.toggle("scroll-up",n),e.title=n?"Scroll to top":"Scroll to bottom",e.setAttribute("aria-label",e.title),e.disabled=t<=0}function mn(){let{maxScroll:e}=De();window.scrollTo({top:rt()?0:e,behavior:"smooth"})}function k(){let e={search:o("searchInput")?.value||"",regexMode:o("regexMode")?.checked||!1,fromDate:o("fromDate")?.value||"",toDate:o("toDate")?.value||"",dateFilterField:o("dateFilterField")?.value||"surveyCompletedOn",assessmentStatus:o("assessmentStatusFilter")?.value||""};if(M=Ge(P,e),J)M=M.filter(t=>t.appMgrName===J);else{let t=at();t&&(M=M.filter(n=>t.test(n.appMgrName||"")))}le()}function fn(){o("searchInput").value="",o("regexMode").checked=!1,o("fromDate").value="",o("toDate").value="",o("dateFilterField").value="surveyCompletedOn",o("assessmentStatusFilter").value="",o("ownerSearchInput").value="",J="",ve(),M=[...P],le()}function le(){let e=o("assessmentList");e.innerHTML="",M.forEach(t=>{let n=vn(t),s=document.createElement("div");s.className=`assessment-row ${n.className}`,s.innerHTML=`

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
                        ${wn(t)}
                    </div>

                    <div class="asset-sub status-detail">

                        ${n.detail}

                    </div>

                </div>

            `,e.appendChild(s)}),hn(),it()}function wn(e){let t=_(e.dueOn||e.raw?.dueOn)||"N/A";if(de(e))return`<strong>Incomplete initiated date:</strong> ${_(e.incompleteInitiatedOn||e.raw?.incompleteInitiatedOn)||"N/A"} \u2022 <strong>Due on:</strong> ${t}`;let n=_(e.surveyCompletedOn||e.raw?.surveyCompletedOn)||"N/A";return`<strong>Due on:</strong> ${t} \u2022 <strong>Survey Completed(Last):</strong> ${n}`}function vn(e){if(de(e)){let a=e.incompleteInitiatedByName||e.raw?.incompleteInitiatedByName||"N/A",l=e.incompleteInitiatedOn||e.raw?.incompleteInitiatedOn;return{label:"Incomplete",className:"status-incomplete",detail:`Incomplete mark \u2022 Initiated by ${a}${l?` \u2022 ${_(l)}`:""}`}}let n=e.attestName||e.raw?.attestName||"N/A",s=e.attestOn||e.raw?.attestOn;return{label:"Completed",className:"status-completed",detail:`Attested by ${n}${s?` \u2022 ${_(s)}`:""}`}}function _(e){if(!e)return"";let t=new Date(e);return Number.isNaN(t.getTime())?e:t.toLocaleDateString(void 0,{year:"numeric",month:"short",day:"2-digit"})}function hn(){document.querySelectorAll(".assessment-checkbox").forEach(e=>{e.addEventListener("change",t=>{let n=Number(t.target.dataset.id);t.target.checked?$.includes(n)||$.push(n):$=$.filter(s=>s!==n),it()})})}function it(){o("selectedCount").textContent=`${$.length} Selected`}function gn(){$=We(M),le()}function yn(){$=[],le()}async function Sn(){o("refreshBtn").disabled=!0;try{await chrome.runtime.sendMessage({action:"REFRESH_ASSESSMENTS"}),await ot()}finally{o("refreshBtn").disabled=!1}}async function En(){let e=P.filter(t=>$.includes(t.assessmentId));if(e.length===0){alert("Select at least one assessment.");return}X=!1,U("validation"),o("progressContainer")?.classList.remove("hidden"),o("cancelBtn")?.classList.remove("hidden"),o("cancelReviewBtn")?.classList.add("hidden"),o("retryFailedBtn")?.classList.add("hidden"),await chrome.runtime.sendMessage({action:"START_VALIDATION",assessments:e})}async function bn(){let e=P.filter(t=>$.includes(t.assessmentId));if(e.length===0){alert("Select at least one assessment.");return}oe=!1,U("review"),o("progressContainer")?.classList.remove("hidden"),K({completed:0,total:e.length,current:"Starting review",startedAt:Date.now(),type:"review"}),o("cancelReviewBtn")?.classList.remove("hidden"),o("cancelBtn")?.classList.add("hidden"),o("retryFailedBtn")?.classList.add("hidden"),o("reviewBtn").disabled=!0,await chrome.runtime.sendMessage({action:"START_REVIEW",assessments:e,reviewConfig:{mode:ae}})}async function An(){let t=(await chrome.storage.local.get(S.STORAGE_KEYS.REVIEW_MODE))[S.STORAGE_KEYS.REVIEW_MODE];ae=Object.values(Y).includes(t)?t:Y.INITIAL,lt()}function lt(){document.querySelectorAll("input[name='reviewMode']").forEach(e=>{e.checked=e.value===ae})}function Tn(){lt(),o("reviewSettingsModal")?.classList.remove("hidden")}function Oe(){o("reviewSettingsModal")?.classList.add("hidden")}async function Nn(){let e=document.querySelector("input[name='reviewMode']:checked");ae=Object.values(Y).includes(e?.value)?e.value:Y.INITIAL,await chrome.storage.local.set({[S.STORAGE_KEYS.REVIEW_MODE]:ae}),Oe()}function xn(){setInterval(async()=>{let e=await chrome.storage.local.get(["validationProgress","validationComplete","validationResults","validationError","reviewProgress","reviewComplete","reviewResults","reviewError",S.STORAGE_KEYS.LAST_ACTION]),t=e[S.STORAGE_KEYS.LAST_ACTION]||O;t==="validation"&&e.validationProgress&&!e.validationComplete&&K(e.validationProgress,"validation"),e.validationComplete&&!X&&(A=e.validationResults||[],Be(A),X=!0,U("validation"),o("exportBtn")?.classList.remove("hidden"),o("clearResultsBtn")?.classList.remove("hidden"),o("cancelBtn")?.classList.add("hidden"),K(e.validationProgress,"validation"),(await ce()).length?o("retryFailedBtn")?.classList.remove("hidden"):o("retryFailedBtn")?.classList.add("hidden")),t==="review"&&e.reviewProgress&&!e.reviewComplete&&K(e.reviewProgress,"review"),e.reviewComplete&&!oe&&(C=e.reviewResults||[],we(C),oe=!0,U("review"),o("reviewBtn").disabled=!1,K(e.reviewProgress,"review"),o("cancelReviewBtn")?.classList.add("hidden"),o("clearReviewResultsBtn")?.classList.remove("hidden")),t==="validation"&&e.validationError&&!e.validationProgress&&(o("cancelBtn")?.classList.add("hidden"),o("progressText").textContent=e.validationError),e.reviewError&&(o("reviewBtn").disabled=!1,o("cancelReviewBtn")?.classList.add("hidden"))},1e3)}function K(e,t=O){if(!e||!e.total)return;let n=Math.round(e.completed/e.total*100),s=e.completedAt||Date.now(),a=e.startedAt||s,l=Math.max(0,s-a),r=e.completed>=e.total,i=!r&&e.completed>0?Re(Math.max(0,l/e.completed*(e.total-e.completed))):r?"Complete":"Calculating",d=t==="review"?"Review":"Validation",c=e.current&&!String(e.current).toLowerCase().includes("completed")?` \u2022 Current: ${e.current}`:"";o("progressText").textContent=r?`${d} complete: ${e.completed}/${e.total} processed \u2022 Time Elapsed: ${Re(l)} \u2022 Estimated Time: Complete`:`${d} in progress: ${e.completed}/${e.total} processed${c} \u2022 Time Elapsed: ${Re(l)} \u2022 Estimated Time: ${i}`,o("progressFill").style.width=`${n}%`}function Re(e){let t=Math.max(0,Math.round(e/1e3));if(t<60)return`${t}s`;let n=Math.floor(t/60),s=t%60;return`${n}m ${s}s`}function U(e){O=e==="review"?"review":"validation",o("validationTabBtn")?.classList.toggle("active",O==="validation"),o("reviewTabBtn")?.classList.toggle("active",O==="review"),o("resultsContainer")?.classList.toggle("hidden",O!=="validation"),o("reviewResultsContainer")?.classList.toggle("hidden",O!=="review"),q()}function q(){let e=A&&A.length>0,t=C&&C.length>0;o("exportBtn")?.classList.toggle("hidden",O!=="validation"||!e),o("clearResultsBtn")?.classList.toggle("hidden",O!=="validation"||!e),o("clearReviewResultsBtn")?.classList.toggle("hidden",O!=="review"||!t)}function Be(e){let t=o("validationCardsContainer");if(t.innerHTML="",!e||e.length===0){q();return}e.forEach(n=>{let s=document.createElement("div");s.className="result-card";let a=n.results&&n.results.some(i=>i.reason==="Question identifier was not found in the survey questions."),l=n.summary?n.summary.score:null,r=l!==null&&l<90;s.innerHTML=`

                <div class="result-header">

                    <strong>

                        ${n.assetName}

                    </strong>

                    <div style="display: flex; align-items: center; gap: 8px;">
                        ${a?'<span class="score-error-indicator" title="Question identifier was not found in the survey questions.">! Error</span>':""}
                        <span class="score-pill ${r?"score-low":""}">
                            ${n.summary?`${l}%`:"Error"}
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

                        ${n.results.map(i=>`

                            <div${i.reason==="Question identifier was not found in the survey questions."?' class="rule-error-missing"':""}>

                                <strong>
                                    ${i.id}
                                </strong>

                                :

                                ${i.status}

                                <br>

                                <small>
                                    ${i.reason}
                                </small>

                            </div>

                            <hr>
                        `).join("")}

                    </div>

                </details>
                    `}
            `,t.appendChild(s)}),document.querySelectorAll(".download-context").forEach(n=>{n.addEventListener("click",()=>{Jn(n.dataset.id)})}),q()}function we(e){let t=o("reviewCardsContainer");if(t.innerHTML="",!e||e.length===0){t.innerHTML='<div class="review-empty">No review results yet.</div>',q();return}e.forEach(n=>{let s=document.createElement("div"),a=n.status==="Incomplete"?"status-incomplete":"status-completed";s.className=`review-card ${a}`;let l=n.status==="Incomplete"?`
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
                    <span class="status-pill ${a}">
                        ${n.status||"Completed"}
                    </span>
                </div>
                <div class="review-card-meta">
                    ${l}
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
            `,t.appendChild(s)}),document.querySelectorAll(".review-notes-btn").forEach(n=>{n.addEventListener("click",()=>Cn(n.dataset.id))}),q()}async function In(){if(!u||u.error)return;let e=ct(u);e.length!==0&&await ze({...u,workQueue:e})}function Cn(e){let t=C.find(n=>String(n.assessmentId)===String(e));!t||t.error||(u=t,o("reviewNotesTitle").textContent=t.assetName||"Review Notes",o("reviewNotesMeta").innerHTML=t.notesMetaHtml||"",Rn(t),Mn(t),_e(),o("reviewNotesModal")?.classList.remove("hidden"))}function $e(){o("reviewNotesModal")?.classList.add("hidden"),u=null}function Rn(e){let t=o("reviewBasisTooltip"),n=o("reviewBasisInfo");if(!t||!n)return;let s=e.reviewBasis||{},a=Ln(s.reviewMode||e.reviewMode),l=s.assessmentBehavior||(e.status==="Incomplete"?"Incomplete assessment review uses the incomplete survey template.":"Completed assessment review uses the latest released survey template."),r=s.newAnswersUsed===!0?"Yes":"No";t.innerHTML=`
        <div><strong>Review mode:</strong> ${f(a)}</div>
        <div><strong>Behavior:</strong> ${f(l)}</div>
        <div><strong>Old survey template ID:</strong> ${f(s.oldSurveyTemplateId||e.oldSurveyTemplateId||"N/A")}</div>
        <div><strong>New survey template ID:</strong> ${f(s.newSurveyTemplateId||e.newSurveyTemplateId||"N/A")}</div>
        <div><strong>newAnswers used:</strong> ${f(r)}</div>
    `,n.classList.toggle("hidden",!1)}function Ln(e){return e==="selectedAnswers"?"Review Based on Selected Answers":"Initial Review Mode"}function On(e){return`
        <span
            class="review-hover-info review-route-info"
            tabindex="0"
            aria-label="Reachability reason"
        >
            <svg viewBox="0 0 24 24" width="16" height="16" stroke="currentColor" stroke-width="2.1" fill="none" stroke-linecap="round" stroke-linejoin="round">
                <circle cx="6" cy="6" r="2"></circle>
                <circle cx="18" cy="18" r="2"></circle>
                <path d="M8 6h3a3 3 0 0 1 3 3v6"></path>
                <path d="m11 12 3 3 3-3"></path>
            </svg>
            <span class="review-hover-panel review-route-panel" role="tooltip">
                ${f(e)}
            </span>
        </span>
    `}async function $n(){z=(await chrome.storage.local.get("reviewQuestionNotes")).reviewQuestionNotes||{}}async function kn(){await chrome.storage.local.set({reviewQuestionNotes:z})}function Mn(e){let t=V(e);F[t]||(F[t]=(e.workQueue||[]).map((n,s)=>ee(n,s)))}function _e(){let e=o("reviewNotesContent");if(!e||!u)return;let t=u.workQueue||[];if(t.length===0){e.innerHTML='<div class="review-output-empty">No reachable unanswered work queue items were found.</div>',ke();return}let n=V(u),s=new Set(F[n]||[]);e.innerHTML=t.map((a,l)=>Dn(a,l,s.has(ee(a,l)))).join(""),Bn(),ke()}function Dn(e,t,n){let s=ee(e,t),a=dt(u,e,t),l=Qn(e),r=e.reachabilityReason?On(e.reachabilityReason):"";return`
        <section class="review-output-item" data-question-key="${f(s)}">
            <div class="review-question-toolbar">
                <label class="review-question-select">
                    <input
                        type="checkbox"
                        class="review-question-checkbox"
                        data-key="${f(s)}"
                        ${n?"checked":""}
                    >
                    <span>Select for download</span>
                </label>
                <div class="review-question-icon-actions">
                    ${r}
                    <button
                        type="button"
                        class="review-note-icon-btn"
                        data-key="${f(s)}"
                        title="ASA Notes"
                        aria-label="ASA Notes"
                    >
                        <svg viewBox="0 0 24 24" width="16" height="16" stroke="currentColor" stroke-width="2.2" fill="none" stroke-linecap="round" stroke-linejoin="round">
                            <path d="M12 20h9"></path>
                            <path d="M16.5 3.5a2.1 2.1 0 0 1 3 3L7 19l-4 1 1-4Z"></path>
                        </svg>
                    </button>
                </div>
            </div>
            ${e.status?`<div class="review-output-status">${f(e.status)}</div>`:""}
            <div class="review-output-id-row">
                <div><strong>Category:</strong> <span>${f(e.questionGroup||"N/A")}</span></div>
                <div><strong>Question ID:</strong> <span>${f(e.questionId||"N/A")}</span></div>
            </div>
            <div class="review-output-field">
                <strong>Question:</strong>
                <span>${f(e.question||"N/A")}</span>
            </div>
            <div class="review-output-field">
                <strong>Answer Type:</strong>
                <span>${f(e.answerType||"N/A")}</span>
            </div>
            <div class="review-output-field">
                <strong>Options:</strong>
                <ul>${l}</ul>
            </div>
            <div class="review-asa-note ${a?"":"hidden"}" data-note-preview="${f(s)}">
                <strong>ASA Notes:</strong>
                <span>${f(a)}</span>
            </div>
            <div class="review-note-editor hidden" data-note-editor="${f(s)}">
                <textarea
                    class="review-note-input"
                    data-note-input="${f(s)}"
                    placeholder="Write ASA notes for this question..."
                >${f(a)}</textarea>
                <button
                    type="button"
                    class="btn-secondary review-note-save-btn"
                    data-key="${f(s)}"
                >
                    Save Notes
                </button>
            </div>
        </section>
    `}function Bn(){document.querySelectorAll(".review-question-checkbox").forEach(e=>{e.addEventListener("change",()=>{_n(e.dataset.key,e.checked),ke()})}),document.querySelectorAll(".review-note-icon-btn").forEach(e=>{e.addEventListener("click",()=>Pn(e.dataset.key))}),document.querySelectorAll(".review-note-save-btn").forEach(e=>{e.addEventListener("click",()=>Un(e.dataset.key))})}function _n(e,t){let n=V(u),s=new Set(F[n]||[]);t?s.add(e):s.delete(e),F[n]=[...s]}function Fn(){if(!u)return;let e=V(u),t=(u.workQueue||[]).map((s,a)=>ee(s,a)),n=F[e]||[];F[e]=n.length===t.length?[]:t,_e()}function ke(){let e=o("downloadReviewNotesBtn"),t=o("selectAllReviewNotesBtn");if(!e||!u)return;let n=(u.workQueue||[]).length,s=ct(u).length;e.textContent=`Download Review Notes (${s}/${n})`,e.disabled=s===0,t&&(t.textContent=s===n&&n>0?"Deselect All":"Select All",t.disabled=n===0)}function ct(e){let t=V(e),n=new Set(F[t]||[]);return(e.workQueue||[]).map((s,a)=>({item:s,index:a,key:ee(s,a)})).filter(s=>n.has(s.key)).map(s=>({...s.item,asaNotes:dt(e,s.item,s.index)}))}function Pn(e){document.querySelector(`[data-note-editor="${ut(e)}"]`)?.classList.toggle("hidden")}async function Un(e){let n=document.querySelector(`[data-note-input="${ut(e)}"]`)?.value.trim()||"",s=V(u);z[s]||(z[s]={}),z[s][e]=n,await kn(),_e()}function dt(e,t,n){let s=V(e),a=ee(t,n);return z[s]?.[a]||""}function V(e){return String(e?.assessmentId||"active")}function ee(e,t){return String(e?.surveyTemplateQuestionId||e?.questionId||`question-${t}`)}function qn(e){return e.internalValue||e.displayValue||"<no options>"}function Qn(e){let t=(e.options||[]).length?e.options:[{internalValue:"<no options>"}],n=String(e.answerType||"").toLowerCase()==="multi select"?"checkbox":"radio",s=n==="checkbox"?"review-option-checkbox-square":"review-option-checkbox-circle";return t.map(a=>`
            <li class="review-option-row">
                <input
                    type="${n}"
                    class="review-option-checkbox ${s}"
                    disabled
                    aria-hidden="true"
                >
                <span>${f(qn(a))}</span>
            </li>
        `).join("")}function f(e){return String(e??"").replace(/&/g,"&amp;").replace(/</g,"&lt;").replace(/>/g,"&gt;").replace(/"/g,"&quot;").replace(/'/g,"&#39;")}function ut(e){return window.CSS?.escape?CSS.escape(e):String(e).replace(/\\/g,"\\\\").replace(/"/g,'\\"')}async function Vn(){if(!u)return;let t=`<!doctype html><html><head><meta charset="utf-8"></head><body>${u.reviewOutputCopyHtml||u.reviewOutputHtml||u.notesHtml||""}</body></html>`,n=u.reviewOutputText||u.notesText||o("reviewNotesContent")?.innerText||"",s=u.reviewOutputRtf||"";try{if(navigator.clipboard?.write&&window.ClipboardItem){let a={"text/html":new Blob([t],{type:"text/html"}),"text/plain":new Blob([n],{type:"text/plain"})};s&&(a["text/rtf"]=new Blob([s],{type:"text/rtf"}));try{await navigator.clipboard.write([new ClipboardItem(a)])}catch{await navigator.clipboard.write([new ClipboardItem({"text/html":new Blob([t],{type:"text/html"}),"text/plain":new Blob([n],{type:"text/plain"})})])}}else await navigator.clipboard.writeText(n);o("copyReviewNotesBtn").textContent="Copied",setTimeout(()=>{o("copyReviewNotesBtn").textContent="Copy Review Output"},1200)}catch{await navigator.clipboard.writeText(n)}}function Hn(){let e=new Map(Pe.map(t=>[t.id,t.openUrl||t.url]));document.querySelectorAll(".prereq-open-link").forEach(t=>{let n=e.get(t.dataset.site);n&&(t.href=n,t.addEventListener("click",s=>{s.preventDefault(),s.stopPropagation(),chrome.tabs.create({url:n})}))})}async function Gn(){let e=await chrome.storage.local.get("prerequisiteStatus");e.prerequisiteStatus&&mt(e.prerequisiteStatus)}async function pt(){Wn();try{let e=await chrome.runtime.sendMessage({action:"CHECK_PREREQUISITES"});e?.success&&e.prerequisites&&mt(e.prerequisites)}catch(e){o("prereqSummary").textContent=`Unable to check sessions: ${e.message}`,document.querySelectorAll(".prereq-item .signal").forEach(t=>{t.className="signal signal-fail"})}}function Wn(){o("prereqSummary").textContent="Checking Cairo, ESATS, and GTC sessions...",document.querySelectorAll(".prereq-item").forEach(e=>{let t=e.querySelector(".signal"),n=e.querySelector("small");t.className="signal signal-checking",n&&(n.textContent="Checking..."),e.title="Checking session..."})}function mt(e){let t=e.checks||[];t.forEach(s=>{let a=document.querySelector(`.prereq-item[data-site="${s.id}"]`);if(!a)return;let l=a.querySelector(".signal"),r=a.querySelector("small");l.className=`signal ${s.passed?"signal-pass":"signal-fail"}`,r&&(r.textContent=s.passed?"Active":"Needs sign-in"),a.title=`${s.message}. Final URL: ${s.finalUrl}`});let n=t.filter(s=>!s.passed);if(n.length===0&&t.length>0){o("prereqSummary").textContent="All prerequisite sessions are active.";return}if(t.length===0){o("prereqSummary").textContent="Session checks have not run yet.";return}o("prereqSummary").textContent=`${n.length} session check${n.length===1?"":"s"} need attention. Open the help tooltip for sign-in steps.`}async function jn(){A=await qe(),C=await Qe(),A&&A.length&&(Be(A),X=!0,o("exportBtn")?.classList.remove("hidden"),o("clearResultsBtn")?.classList.remove("hidden")),C&&C.length?(we(C),oe=!0):we([]);let e=await chrome.storage.local.get(S.STORAGE_KEYS.LAST_ACTION);U(e[S.STORAGE_KEYS.LAST_ACTION]==="review"?"review":"validation"),(await ce()).length&&o("retryFailedBtn")?.classList.remove("hidden")}async function Yn(){await chrome.runtime.sendMessage({action:"CLEAR_RESULTS"}),A=[],Be(A),X=!1,o("retryFailedBtn")?.classList.add("hidden"),o("cancelBtn")?.classList.add("hidden"),o("progressContainer")?.classList.add("hidden"),o("progressFill").style.width="0%",o("progressText").textContent="Starting...",q()}async function Kn(){await chrome.runtime.sendMessage({action:"CLEAR_REVIEW_RESULTS"}),C=[],we(C),oe=!1,o("reviewBtn").disabled=!1,o("cancelReviewBtn")?.classList.add("hidden"),$e(),q()}async function zn(){let e=await ce();e.length!==0&&(X=!1,o("progressContainer")?.classList.remove("hidden"),K({completed:0,total:e.length,current:"Starting validation",startedAt:Date.now()}),o("cancelBtn")?.classList.remove("hidden"),o("retryFailedBtn")?.classList.add("hidden"),await chrome.runtime.sendMessage({action:"START_VALIDATION",assessments:e}))}async function Jn(e){let n=(await Ve())[e];if(!n)return;let s=new Blob([JSON.stringify(n,null,2)],{type:"application/json"}),a=URL.createObjectURL(s),l=document.createElement("a");l.href=a,l.download=`context_${e}.json`,l.click(),URL.revokeObjectURL(a)}async function Xn(){!A||A.length===0||await je(A)}async function Zn(){let e=o("whatsNewIcon"),t=o("surveyDiffModal"),n=o("closeModalBtn"),s=o("refreshDiffBtn"),a=o("surveyFromSearch"),l=o("surveyToSearch"),r=o("runSurveyDiffBtn");!e||!t||!n||(e.addEventListener("click",async()=>{t.classList.remove("hidden");try{await ts()}catch(i){console.error("Survey diff modal restore error:",i),Fe(),B(null,"Unable to load survey versions.")}}),n.addEventListener("click",()=>{t.classList.add("hidden")}),t.addEventListener("click",i=>{i.target===t&&t.classList.add("hidden")}),s&&s.addEventListener("click",ns),a?.addEventListener("focus",()=>{D("from"),o("surveyFromOptions")?.classList.remove("hidden")}),a?.addEventListener("input",()=>{w=null,h=null,l&&(l.value="",l.disabled=!0,l.placeholder="Select From first"),ie(),re(),Q({selectedFromId:null,selectedToId:null,diff:null}),D("from"),o("surveyFromOptions")?.classList.remove("hidden")}),l?.addEventListener("focus",()=>{w&&(D("to"),o("surveyToOptions")?.classList.remove("hidden"))}),l?.addEventListener("input",()=>{h=null,ie(),re(),Q({selectedFromId:w?.surveyTemplateId||null,selectedToId:null,diff:null}),D("to"),o("surveyToOptions")?.classList.remove("hidden")}),r?.addEventListener("click",as),document.addEventListener("click",i=>{i.target.closest(".survey-combobox")||(o("surveyFromOptions")?.classList.add("hidden"),o("surveyToOptions")?.classList.add("hidden"))}))}async function he(){return(await chrome.storage.local.get(S.STORAGE_KEYS.WHATS_NEW_MODAL))[S.STORAGE_KEYS.WHATS_NEW_MODAL]||{}}async function Q(e){let t=await he();await chrome.storage.local.set({[S.STORAGE_KEYS.WHATS_NEW_MODAL]:{...t,...e,updatedAt:Date.now()}})}function st(e){return I.find(t=>Number(t.surveyTemplateId)===Number(e))||null}function es(){let e=o("surveyFromSearch"),t=o("surveyToSearch");e&&(e.value=w?Z(w):""),t&&(t.value=h?Z(h):"",t.disabled=!w,t.placeholder=w?"Search newer versions...":"Select From first"),ie()}async function ts(){let e=await he();Array.isArray(e.templates)&&e.templates.length>0&&(I=Me(e.templates)),I.length===0&&(Fe(),B(null,"Loading survey versions..."),await ft()),w=e.selectedFromId?st(e.selectedFromId):null,h=e.selectedToId?st(e.selectedToId):null,w&&h&&h.versionNumber<=w.versionNumber&&(h=null),es(),D("from"),e.diff&&w&&h?B(e.diff):B(null,"Select a From and To version, then click What's New.")}async function ns(){let e=o("refreshDiffBtn");if(!(!e||e.disabled)){e.disabled=!0,e.setAttribute("aria-busy","true"),se+=1;try{Fe(),re(),await Q({selectedFromId:null,selectedToId:null,diff:null,templates:[]}),await ft(!0)}catch(t){console.error("Survey template refresh error:",t),B(null,"Unable to load survey versions.")}finally{e.disabled=!1,e.removeAttribute("aria-busy")}}}function Me(e){return(Array.isArray(e)?e:Object.values(e||{})).filter(n=>n&&n.surveyTemplateId&&n.versionNumber!==void 0&&n.versionNumber!==null).map(n=>({...n,surveyTemplateId:Number(n.surveyTemplateId),versionNumber:Number(n.versionNumber)})).filter(n=>!Number.isNaN(n.surveyTemplateId)&&!Number.isNaN(n.versionNumber)).sort((n,s)=>s.versionNumber-n.versionNumber)}async function ft(e=!1){if(I.length>0&&!e){D("from");return}if(!e){let n=await he();if(Array.isArray(n.templates)&&n.templates.length>0){I=Me(n.templates),D("from");return}}e&&(I=[]);let t=o("surveyFromSearch");t&&(t.placeholder="Loading versions...",t.disabled=!0);try{I=Me(await Ze()),await Q({templates:I}),t&&(t.disabled=!1,t.placeholder="Search versions..."),D("from")}catch(n){throw console.error("Survey template load error:",n),t&&(t.disabled=!1,t.placeholder="Unable to load versions"),n}}function Fe(){w=null,h=null;let e=o("surveyFromSearch"),t=o("surveyToSearch");e&&(e.value="",e.disabled=!1,e.placeholder="Search versions..."),t&&(t.value="",t.disabled=!0,t.placeholder="Select From first"),o("surveyFromOptions")?.classList.add("hidden"),o("surveyToOptions")?.classList.add("hidden"),o("surveyFromOptions")&&(o("surveyFromOptions").innerHTML=""),o("surveyToOptions")&&(o("surveyToOptions").innerHTML=""),ie()}function re(){let e=o("diffDateRange"),t=o("diffContent");e&&(e.textContent="",e.classList.add("hidden")),t&&(t.innerHTML="")}function Z(e){let t=e.releasedOn?_(e.releasedOn):"-",n=e.deactivatedOn?_(e.deactivatedOn):"-";return`Version-${e.versionNumber} (Released on: ${t}, Deactivated on: ${n})`}function ss(e){return e==="to"?w?I.filter(t=>t.versionNumber>w.versionNumber):[]:I}function D(e){let t=o(e==="from"?"surveyFromSearch":"surveyToSearch"),n=o(e==="from"?"surveyFromOptions":"surveyToOptions");if(!t||!n)return;let s=t.value.trim().toLowerCase(),a=ss(e).filter(l=>Z(l).toLowerCase().includes(s));if(n.innerHTML="",a.length===0){let l=document.createElement("div");l.className="survey-option-empty",l.textContent=I.length===0?"No survey versions found.":"No matching versions.",n.appendChild(l);return}a.forEach(l=>{let r=document.createElement("button");r.type="button",r.className="survey-option",r.value=String(l.surveyTemplateId),r.textContent=Z(l),r.addEventListener("click",()=>{os(e,l)}),n.appendChild(r)})}function os(e,t){if(e==="from"){w=t,h=null;let n=o("surveyFromSearch"),s=o("surveyToSearch");n&&(n.value=Z(t)),s&&(s.value="",s.disabled=!1,s.placeholder="Search newer versions..."),o("surveyFromOptions")?.classList.add("hidden"),D("to"),re(),Q({selectedFromId:t.surveyTemplateId,selectedToId:null,diff:null})}else{h=t;let n=o("surveyToSearch");n&&(n.value=Z(t)),o("surveyToOptions")?.classList.add("hidden"),re(),Q({selectedFromId:w?.surveyTemplateId||null,selectedToId:t.surveyTemplateId,diff:null})}ie()}function ie(){let e=o("runSurveyDiffBtn");e&&e.classList.toggle("hidden",!w||!h)}async function as(){if(!w||!h)return;let e=o("runSurveyDiffBtn"),t=se+1;se=t,e&&(e.disabled=!0,e.textContent="Loading...");try{let n=await he();if(n.diff&&Number(n.selectedFromId)===Number(w.surveyTemplateId)&&Number(n.selectedToId)===Number(h.surveyTemplateId)){B(n.diff);return}B(null,"Loading changes...");let s=await tt(w.surveyTemplateId,h.surveyTemplateId);t===se&&(B(s),await Q({selectedFromId:w.surveyTemplateId,selectedToId:h.surveyTemplateId,diff:s}))}catch(n){console.error("Survey diff error:",n),t===se&&B(null,"Unable to load survey differences.")}finally{e&&(e.disabled=!1,e.textContent="What's New")}}function B(e,t="No changes detected between the selected survey templates."){let n=o("diffDateRange"),s=o("diffContent");if(!n||!s)return;if(s.innerHTML="",!e||e.newQuestions.length===0&&e.removedQuestions.length===0&&e.modifiedQuestions.length===0){n.classList.add("hidden");let r=document.createElement("div");r.className="diff-empty",r.textContent=t,s.appendChild(r);return}let a=e.metadata.fromReleasedOn||e.metadata.fromUpdatedOn?_(e.metadata.fromReleasedOn||e.metadata.fromUpdatedOn):"Unknown",l=e.metadata.toReleasedOn||e.metadata.toUpdatedOn?_(e.metadata.toReleasedOn||e.metadata.toUpdatedOn):"Unknown";n.textContent=`From V-${e.metadata.fromVersionNumber||e.metadata.fromId} (${a}) to V-${e.metadata.toVersionNumber||e.metadata.toId} (${l})`,n.classList.remove("hidden"),e.newQuestions.forEach(r=>{let i=document.createElement("div");i.className="diff-item",i.innerHTML=`
            <h4><span class="diff-tag new">New Question</span> <span class="diff-id">[${r.alternateQuestionId}]</span></h4>
            <div class="diff-detail"><strong>Context:</strong> ${r.questionText||"\u2014"}</div>
        `,s.appendChild(i)}),e.removedQuestions.forEach(r=>{let i=document.createElement("div");i.className="diff-item",i.innerHTML=`
            <h4><span class="diff-tag removed">Removed Question</span> <span class="diff-id">[${r.alternateQuestionId}]</span></h4>
            <div class="diff-detail"><strong>Context:</strong> ${r.questionText||"\u2014"}</div>
        `,s.appendChild(i)}),e.modifiedQuestions.forEach(r=>{let i=document.createElement("div");i.className="diff-item";let d="",c="";r.textChanged&&(d+='<span class="diff-tag changed">Question Changed</span>',c+=`
                <div class="diff-detail"><strong>Old:</strong> ${r.textChanged.old}</div>
                <div class="diff-detail"><strong>New:</strong> ${r.textChanged.new}</div>
            `),r.optionsChanged&&(d+='<span class="diff-tag changed">Options Changed</span>',r.optionsChanged.added?.length>0&&(c+=`<div class="diff-detail"><strong>Added Options:</strong> ${r.optionsChanged.added.join(", ")}</div>`),r.optionsChanged.removed?.length>0&&(c+=`<div class="diff-detail"><strong>Removed Options:</strong> ${r.optionsChanged.removed.join(", ")}</div>`)),i.innerHTML=`
            <h4>${d} <span class="diff-id">[${r.alternateQuestionId}]</span></h4>
            ${c}
        `,s.appendChild(i)})}
