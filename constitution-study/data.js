// Study content. Summaries are plain-language study aids — always confirm against
// the actual constitutional text for exact wording.

const US_CONSTITUTION = [
  {
    title: "Preamble",
    tag: "Foundation",
    summary: "States the purpose of the Constitution. Does not grant any powers by itself.",
    points: [
      "Six goals: form a more perfect Union, establish Justice, insure domestic Tranquility, provide for the common defence, promote the general Welfare, secure the Blessings of Liberty.",
      "Opens with 'We the People' — sovereignty comes from the people, not the states."
    ]
  },
  {
    title: "Article I — Legislative Branch",
    tag: "Congress",
    summary: "Creates Congress (the lawmaking branch): a House of Representatives and a Senate.",
    points: [
      "House: 2-year terms, based on population, must be 25+, citizen 7+ years. Originates revenue/tax bills; holds power of impeachment.",
      "Senate: 6-year terms, 2 per state, must be 30+, citizen 9+ years. Tries impeachments; confirms appointments and treaties.",
      "Enumerated powers (Sec. 8): tax, borrow, regulate interstate commerce, coin money, declare war, raise army/navy.",
      "Necessary and Proper Clause ('elastic clause') — implied powers to carry out enumerated ones.",
      "Section 9 limits on Congress: no suspending habeas corpus (except rebellion/invasion), no bills of attainder, no ex post facto laws."
    ]
  },
  {
    title: "Article II — Executive Branch",
    tag: "President",
    summary: "Creates the presidency to enforce the laws.",
    points: [
      "4-year term; must be a natural-born citizen, 35+, resident 14 years.",
      "Elected by the Electoral College, not directly by popular vote.",
      "Powers: Commander-in-Chief, makes treaties (Senate ratifies by 2/3), appoints judges/officials (Senate confirms), grants pardons.",
      "Must 'take Care that the Laws be faithfully executed.'",
      "Can be removed by impeachment for 'Treason, Bribery, or other high Crimes and Misdemeanors.'"
    ]
  },
  {
    title: "Article III — Judicial Branch",
    tag: "Courts",
    summary: "Creates the Supreme Court and allows Congress to create lower federal courts.",
    points: [
      "Judges serve 'during good Behaviour' — effectively life tenure.",
      "Defines the courts' jurisdiction (cases under the Constitution, federal law, treaties).",
      "Defines treason narrowly: levying war against the U.S. or aiding its enemies; needs two witnesses or confession in court.",
      "Judicial review (power to strike down unconstitutional laws) was established later in Marbury v. Madison (1803), not written in the text."
    ]
  },
  {
    title: "Article IV — The States",
    tag: "Federalism",
    summary: "Governs relationships between the states and between states and the federal government.",
    points: [
      "Full Faith and Credit Clause: states must respect other states' laws, records, and court rulings.",
      "Privileges and Immunities: a state can't discriminate against citizens of other states.",
      "Extradition of fugitives between states.",
      "Admission of new states; guarantees each state a 'Republican Form of Government.'"
    ]
  },
  {
    title: "Article V — Amendment Process",
    tag: "Amending",
    summary: "How the Constitution is changed. Intentionally difficult.",
    points: [
      "Proposal: 2/3 of both houses of Congress, OR a convention called by 2/3 of the states.",
      "Ratification: 3/4 of state legislatures, OR 3/4 of state conventions.",
      "27 amendments have been ratified; all but one (21st) used the legislature route."
    ]
  },
  {
    title: "Article VI — Supremacy",
    tag: "Supremacy",
    summary: "Establishes the Constitution as the highest law of the land.",
    points: [
      "Supremacy Clause: the Constitution, federal laws, and treaties override conflicting state laws.",
      "All officials (federal and state) must swear an oath to support the Constitution.",
      "No religious test required to hold office.",
      "U.S. assumes debts from before the Constitution."
    ]
  },
  {
    title: "Article VII — Ratification",
    tag: "Ratification",
    summary: "Set the rules for adopting the Constitution originally.",
    points: ["Required 9 of the 13 states to ratify for the Constitution to take effect."]
  },
  {
    title: "1st Amendment",
    tag: "Bill of Rights",
    summary: "Five freedoms: Religion, Speech, Press, Assembly, Petition.",
    points: [
      "Establishment Clause (no official religion) + Free Exercise Clause.",
      "Freedom of speech, press, peaceable assembly, and to petition the government."
    ]
  },
  { title: "2nd Amendment", tag: "Bill of Rights", summary: "Right to keep and bear arms.", points: ["Tied to a 'well regulated Militia.'"] },
  { title: "3rd Amendment", tag: "Bill of Rights", summary: "No quartering of soldiers in private homes during peacetime without consent.", points: [] },
  { title: "4th Amendment", tag: "Bill of Rights", summary: "Protection from unreasonable searches and seizures.", points: ["Warrants require probable cause and must be specific."] },
  {
    title: "5th Amendment",
    tag: "Bill of Rights",
    summary: "Rights of the accused.",
    points: [
      "Grand jury for serious crimes; no double jeopardy; no self-incrimination ('plead the Fifth').",
      "Due process of law; eminent domain requires 'just compensation.'"
    ]
  },
  { title: "6th Amendment", tag: "Bill of Rights", summary: "Rights to a fair criminal trial.", points: ["Speedy, public trial; impartial jury; informed of charges; confront witnesses; right to an attorney."] },
  { title: "7th Amendment", tag: "Bill of Rights", summary: "Right to a jury trial in civil cases.", points: [] },
  { title: "8th Amendment", tag: "Bill of Rights", summary: "No excessive bail/fines or cruel and unusual punishment.", points: [] },
  { title: "9th Amendment", tag: "Bill of Rights", summary: "Rights not listed in the Constitution are still retained by the people.", points: [] },
  { title: "10th Amendment", tag: "Bill of Rights", summary: "Powers not given to the federal government are reserved to the states or the people.", points: ["Foundation of states' rights / federalism."] },
  { title: "11th Amendment", tag: "Amendment", summary: "Limits suits against states in federal court.", points: [] },
  { title: "12th Amendment", tag: "Amendment", summary: "Separate Electoral College votes for President and Vice President.", points: [] },
  { title: "13th Amendment", tag: "Reconstruction", summary: "Abolished slavery.", points: [] },
  { title: "14th Amendment", tag: "Reconstruction", summary: "Citizenship, due process, and equal protection.", points: ["Birthright citizenship; states must provide due process and equal protection; basis for applying the Bill of Rights to the states."] },
  { title: "15th Amendment", tag: "Reconstruction", summary: "Right to vote cannot be denied based on race.", points: [] },
  { title: "16th Amendment", tag: "Amendment", summary: "Allows Congress to collect an income tax.", points: [] },
  { title: "17th Amendment", tag: "Amendment", summary: "Direct election of U.S. Senators by the people.", points: ["Previously chosen by state legislatures."] },
  { title: "18th Amendment", tag: "Amendment", summary: "Prohibition — banned alcohol.", points: ["Later repealed by the 21st."] },
  { title: "19th Amendment", tag: "Amendment", summary: "Women's right to vote (women's suffrage).", points: [] },
  { title: "20th Amendment", tag: "Amendment", summary: "'Lame duck' — sets Jan. 20 inauguration and Jan. 3 for Congress.", points: [] },
  { title: "21st Amendment", tag: "Amendment", summary: "Repealed Prohibition (the only amendment to repeal another).", points: [] },
  { title: "22nd Amendment", tag: "Amendment", summary: "Limits the President to two terms.", points: [] },
  { title: "23rd Amendment", tag: "Amendment", summary: "Gives Washington, D.C. electoral votes.", points: [] },
  { title: "24th Amendment", tag: "Amendment", summary: "Bans poll taxes in federal elections.", points: [] },
  { title: "25th Amendment", tag: "Amendment", summary: "Presidential succession and disability.", points: ["Fills a VP vacancy; allows transfer of power if the President is unable to serve."] },
  { title: "26th Amendment", tag: "Amendment", summary: "Lowered the voting age to 18.", points: [] },
  { title: "27th Amendment", tag: "Amendment", summary: "Congressional pay raises take effect only after the next election.", points: [] }
];

const AZ_CONSTITUTION = [
  {
    title: "Overview & Statehood",
    tag: "Background",
    summary: "Arizona became the 48th state on February 14, 1912. Its constitution is known for strong direct-democracy and progressive-era features.",
    points: [
      "Much longer and more detailed than the U.S. Constitution.",
      "Famous for citizen lawmaking tools: initiative, referendum, and recall."
    ]
  },
  {
    title: "Article II — Declaration of Rights",
    tag: "Rights",
    summary: "Arizona's bill of rights — broader than the federal one in several areas.",
    points: [
      "Section 1: 'A frequent recurrence to fundamental principles is essential.'",
      "Section 2: Political power comes from the people ('popular sovereignty').",
      "Explicit right to privacy (broader than the U.S. Constitution).",
      "Includes free speech, religion, due process, and trial by jury protections."
    ]
  },
  {
    title: "Article III — Distribution of Powers",
    tag: "Separation",
    summary: "Establishes three separate branches and bars one branch from exercising another's powers.",
    points: ["Strict separation of legislative, executive, and judicial powers."]
  },
  {
    title: "Article IV — Legislative Department",
    tag: "Direct Democracy",
    summary: "Creates the bicameral Legislature AND reserves lawmaking power to the people. This article is heavily tested.",
    points: [
      "Part 1 reserves to the people the INITIATIVE and REFERENDUM.",
      "Initiative: citizens propose and pass laws/constitutional amendments by petition + vote.",
      "Referendum: citizens vote to approve or reject laws passed by the Legislature.",
      "Legislature: Senate (30 members) and House of Representatives (60 members); 2-year terms.",
      "Voter Protection Act: the Legislature generally cannot repeal or alter voter-passed initiatives (and any change must 'further the purpose')."
    ]
  },
  {
    title: "Article V — Executive Department",
    tag: "Executive",
    summary: "Establishes Arizona's plural executive — power is split among several independently elected officials.",
    points: [
      "Elected statewide: Governor, Secretary of State, Attorney General, State Treasurer, Superintendent of Public Instruction.",
      "Arizona has NO Lieutenant Governor — the Secretary of State is first in line of succession.",
      "Officials serve 4-year terms.",
      "RECALL: voters can remove any elected official before their term ends (Article VIII)."
    ]
  },
  {
    title: "Article VI — Judicial Department",
    tag: "Courts",
    summary: "Establishes Arizona's court system.",
    points: [
      "Levels: Supreme Court, Court of Appeals, Superior Court (and lower courts like justice/municipal).",
      "Uses merit selection (the 'Missouri Plan') for appellate and large-county trial judges, followed by retention elections.",
      "Arizona Supreme Court is the highest state court."
    ]
  },
  {
    title: "Article VII — Suffrage and Elections",
    tag: "Voting",
    summary: "Sets voting rights and election rules.",
    points: ["Right to vote for qualified citizens; secret ballot; rules for elections."]
  },
  {
    title: "Article VIII — Removal from Office (Recall)",
    tag: "Direct Democracy",
    summary: "Gives voters the power to RECALL (remove) any elected officer.",
    points: [
      "Requires petition signatures equal to 25% of votes cast for that office in the last election.",
      "Arizona is one of the states that allows recall of judges."
    ]
  },
  {
    title: "Other Notable Features",
    tag: "Misc",
    summary: "Distinctive Arizona provisions often on the exam.",
    points: [
      "The 'three Rs' summarize Arizona's direct democracy: Initiative, Referendum, Recall.",
      "Strong public education clause; the Permanent Fund supports schools.",
      "Water rights and corporation regulation (Arizona Corporation Commission) are uniquely detailed."
    ]
  }
];
